from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import Policy, Quote, QuoteItem, Product
from app.services.quote_service import QuoteService
from app.guards.decisions import PolicyDecisionType, PolicyCheckCode
from app.guards.models import PolicyDecision, PolicyCheckResult, PolicyReason


class DeterministicPolicyEngine:
    """
    Deterministic Financial Policy Engine for AgentPay Gateway.
    
    ARCHITECTURAL PRINCIPLE:
    - LLM proposes; Deterministic code authorizes.
    - Operates strictly on server-authoritative Quote data.
    - Fail-Closed: any missing entity or evaluation error results in BLOCK.
    - Deterministic evaluation order.
    """

    def __init__(self, db: Session):
        self.db = db
        self.quote_service = QuoteService(db)

    def evaluate_quote_policy(self, quote_id: str, policy_id: str = "policy_demo") -> PolicyDecision:
        """
        Evaluate an authoritative quote against a specific policy using deterministic rules.
        
        Evaluation Order:
        1. Policy Existence Check
        2. Policy Active Status Check
        3. Authoritative Quote Real-Time Validation
        4. Currency Match Check
        5. Cart Item Count Limit Check
        6. Per-SKU Quantity Limit Check
        7. Explicitly Blocked SKU Check
        8. Allowed SKU Allowlist Check (if configured)
        9. Product Category Allowlist Check
        10. Maximum Transaction Amount Check (Integer Paise)
        11. Confirmation Threshold Check (Integer Paise)
        """
        checks: List[PolicyCheckResult] = []
        reasons: List[PolicyReason] = []
        now = datetime.now(timezone.utc)

        # 1. Policy Existence
        policy = self.db.scalars(select(Policy).where(Policy.id == policy_id.strip())).first()
        if not policy:
            check = PolicyCheckResult(
                check_name="policy_exists",
                passed=False,
                code=PolicyCheckCode.POLICY_NOT_FOUND.value,
                message=f"Policy '{policy_id}' not found.",
                details={"policy_id": policy_id}
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy_id,
                quote_id=quote_id,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="policy_exists",
            passed=True,
            code="POLICY_EXISTS",
            message="Policy exists."
        ))

        # 2. Policy Active Status
        if not policy.active:
            check = PolicyCheckResult(
                check_name="policy_active",
                passed=False,
                code=PolicyCheckCode.POLICY_INACTIVE.value,
                message=f"Policy '{policy.id}' is inactive.",
                details={"policy_id": policy.id, "active": policy.active}
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote_id,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="policy_active",
            passed=True,
            code="POLICY_ACTIVE",
            message="Policy is active."
        ))

        # 3. Authoritative Quote Real-Time Validation (Signature, TTL, Stock, Price Mutex)
        validation_res = self.quote_service.validate_quote(quote_id)
        if not validation_res.valid:
            check = PolicyCheckResult(
                check_name="quote_authoritative_validation",
                passed=False,
                code=PolicyCheckCode.QUOTE_INVALID.value,
                message=f"Authoritative quote validation failed: {validation_res.reason}",
                details={"quote_id": quote_id, "validation_reason": validation_res.reason, "details": validation_res.details}
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote_id,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="quote_authoritative_validation",
            passed=True,
            code="QUOTE_VALID",
            message="Authoritative quote is valid, active, and unexpired."
        ))

        # Load authoritative quote from database
        quote = self.db.scalars(select(Quote).where(Quote.id == quote_id)).first()
        if not quote:
            # Defensive check
            check = PolicyCheckResult(
                check_name="quote_loaded",
                passed=False,
                code=PolicyCheckCode.QUOTE_INVALID.value,
                message="Quote could not be retrieved from database."
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote_id,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )

        # 4. Currency Check
        if quote.currency.upper() != policy.currency.upper():
            check = PolicyCheckResult(
                check_name="currency_match",
                passed=False,
                code=PolicyCheckCode.CURRENCY_NOT_ALLOWED.value,
                message=f"Quote currency '{quote.currency}' does not match policy allowed currency '{policy.currency}'.",
                details={"quote_currency": quote.currency, "policy_currency": policy.currency}
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote.id,
                merchant_id=quote.merchant_id,
                transaction_amount_paise=quote.total,
                currency=quote.currency,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="currency_match",
            passed=True,
            code="CURRENCY_ALLOWED",
            message=f"Currency '{quote.currency}' allowed."
        ))

        # 5. Cart Item Count Check (Total item count across all line items)
        total_item_count = sum(item.quantity for item in quote.items)
        if total_item_count > policy.max_cart_items:
            check = PolicyCheckResult(
                check_name="cart_item_limit",
                passed=False,
                code=PolicyCheckCode.CART_ITEM_LIMIT_EXCEEDED.value,
                message=f"Total cart items ({total_item_count}) exceeds policy maximum limit ({policy.max_cart_items}).",
                details={"total_item_count": total_item_count, "max_cart_items": policy.max_cart_items}
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote.id,
                merchant_id=quote.merchant_id,
                transaction_amount_paise=quote.total,
                currency=quote.currency,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="cart_item_limit",
            passed=True,
            code="CART_ITEM_LIMIT_OK",
            message=f"Cart item count ({total_item_count}) within limit ({policy.max_cart_items})."
        ))

        # 6. Per-SKU Quantity Check
        for item in quote.items:
            if item.quantity > policy.max_quantity_per_sku:
                check = PolicyCheckResult(
                    check_name="quantity_limit",
                    passed=False,
                    code=PolicyCheckCode.QUANTITY_LIMIT_EXCEEDED.value,
                    message=f"Quantity for SKU '{item.sku}' ({item.quantity}) exceeds max allowed per SKU ({policy.max_quantity_per_sku}).",
                    details={"sku": item.sku, "quantity": item.quantity, "max_quantity_per_sku": policy.max_quantity_per_sku}
                )
                checks.append(check)
                reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
                return PolicyDecision(
                    decision=PolicyDecisionType.BLOCK,
                    policy_id=policy.id,
                    policy_version=policy.policy_version,
                    quote_id=quote.id,
                    merchant_id=quote.merchant_id,
                    transaction_amount_paise=quote.total,
                    currency=quote.currency,
                    reasons=reasons,
                    checks=checks,
                    evaluated_at=now
                )
        checks.append(PolicyCheckResult(
            check_name="quantity_limit",
            passed=True,
            code="QUANTITY_LIMIT_OK",
            message="All SKU quantities within allowed bounds."
        ))

        # Retrieve product objects for category and SKU checks
        product_ids = [item.product_id for item in quote.items]
        products = list(self.db.scalars(select(Product).where(Product.id.in_(product_ids))).all())
        product_map = {p.id: p for p in products}

        # 7. Explicitly Blocked SKU Check (Blocked SKU always wins)
        blocked_set = set(policy.blocked_skus or [])
        for item in quote.items:
            if item.sku in blocked_set:
                check = PolicyCheckResult(
                    check_name="blocked_sku",
                    passed=False,
                    code=PolicyCheckCode.SKU_BLOCKED.value,
                    message=f"SKU '{item.sku}' is explicitly blocked by policy.",
                    details={"sku": item.sku}
                )
                checks.append(check)
                reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
                return PolicyDecision(
                    decision=PolicyDecisionType.BLOCK,
                    policy_id=policy.id,
                    policy_version=policy.policy_version,
                    quote_id=quote.id,
                    merchant_id=quote.merchant_id,
                    transaction_amount_paise=quote.total,
                    currency=quote.currency,
                    reasons=reasons,
                    checks=checks,
                    evaluated_at=now
                )
        checks.append(PolicyCheckResult(
            check_name="blocked_sku",
            passed=True,
            code="NO_BLOCKED_SKUS",
            message="No items match blocked SKU list."
        ))

        # 8. Allowed SKU Allowlist Check (If configured and non-empty)
        if policy.allowed_skus and len(policy.allowed_skus) > 0:
            allowed_sku_set = set(policy.allowed_skus)
            for item in quote.items:
                if item.sku not in allowed_sku_set:
                    check = PolicyCheckResult(
                        check_name="allowed_sku_whitelist",
                        passed=False,
                        code=PolicyCheckCode.SKU_NOT_ALLOWED.value,
                        message=f"SKU '{item.sku}' is not present in the allowed SKU whitelist.",
                        details={"sku": item.sku, "allowed_skus": policy.allowed_skus}
                    )
                    checks.append(check)
                    reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
                    return PolicyDecision(
                        decision=PolicyDecisionType.BLOCK,
                        policy_id=policy.id,
                        policy_version=policy.policy_version,
                        quote_id=quote.id,
                        merchant_id=quote.merchant_id,
                        transaction_amount_paise=quote.total,
                        currency=quote.currency,
                        reasons=reasons,
                        checks=checks,
                        evaluated_at=now
                    )
            checks.append(PolicyCheckResult(
                check_name="allowed_sku_whitelist",
                passed=True,
                code="SKU_WHITELIST_PASSED",
                message="All item SKUs exist in allowed whitelist."
            ))

        # 9. Allowed Category Check
        allowed_cat_set = {cat.lower() for cat in (policy.allowed_categories or [])}
        for item in quote.items:
            product = product_map.get(item.product_id)
            if not product or product.category.lower() not in allowed_cat_set:
                prod_cat = product.category if product else "UNKNOWN"
                check = PolicyCheckResult(
                    check_name="category_whitelist",
                    passed=False,
                    code=PolicyCheckCode.CATEGORY_NOT_ALLOWED.value,
                    message=f"Product category '{prod_cat}' for SKU '{item.sku}' is not allowed by policy.",
                    details={"sku": item.sku, "category": prod_cat, "allowed_categories": policy.allowed_categories}
                )
                checks.append(check)
                reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
                return PolicyDecision(
                    decision=PolicyDecisionType.BLOCK,
                    policy_id=policy.id,
                    policy_version=policy.policy_version,
                    quote_id=quote.id,
                    merchant_id=quote.merchant_id,
                    transaction_amount_paise=quote.total,
                    currency=quote.currency,
                    reasons=reasons,
                    checks=checks,
                    evaluated_at=now
                )
        checks.append(PolicyCheckResult(
            check_name="category_whitelist",
            passed=True,
            code="CATEGORY_ALLOWED",
            message="All product categories are permitted by policy."
        ))

        # 10. Maximum Transaction Amount Limit Check (Total in paise)
        if quote.total > policy.max_transaction_amount:
            check = PolicyCheckResult(
                check_name="max_amount_limit",
                passed=False,
                code=PolicyCheckCode.AMOUNT_EXCEEDS_LIMIT.value,
                message=f"Transaction total ({quote.total} paise) exceeds maximum allowed limit ({policy.max_transaction_amount} paise).",
                details={
                    "total_paise": quote.total,
                    "max_transaction_amount_paise": policy.max_transaction_amount,
                    "currency": quote.currency
                }
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.BLOCK,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote.id,
                merchant_id=quote.merchant_id,
                transaction_amount_paise=quote.total,
                currency=quote.currency,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="max_amount_limit",
            passed=True,
            code="AMOUNT_WITHIN_LIMIT",
            message=f"Transaction total ({quote.total} paise) within limit ({policy.max_transaction_amount} paise)."
        ))

        # 11. Confirmation Threshold Check
        if quote.total >= policy.confirmation_threshold:
            check = PolicyCheckResult(
                check_name="confirmation_threshold",
                passed=True,  # Check completed as triggering confirmation
                code=PolicyCheckCode.REQUIRE_CONFIRMATION.value,
                message=f"Transaction total ({quote.total} paise) meets or exceeds confirmation threshold ({policy.confirmation_threshold} paise). Human authorization required.",
                details={
                    "total_paise": quote.total,
                    "confirmation_threshold_paise": policy.confirmation_threshold,
                    "currency": quote.currency
                }
            )
            checks.append(check)
            reasons.append(PolicyReason(code=check.code, message=check.message, details=check.details))
            return PolicyDecision(
                decision=PolicyDecisionType.REQUIRE_CONFIRMATION,
                policy_id=policy.id,
                policy_version=policy.policy_version,
                quote_id=quote.id,
                merchant_id=quote.merchant_id,
                transaction_amount_paise=quote.total,
                currency=quote.currency,
                reasons=reasons,
                checks=checks,
                evaluated_at=now
            )
        checks.append(PolicyCheckResult(
            check_name="confirmation_threshold",
            passed=True,
            code="AUTONOMOUS_APPROVAL_ELIGIBLE",
            message=f"Transaction total ({quote.total} paise) below confirmation threshold ({policy.confirmation_threshold} paise)."
        ))

        # ALL CHECKS PASSED -> ALLOW
        return PolicyDecision(
            decision=PolicyDecisionType.ALLOW,
            policy_id=policy.id,
            policy_version=policy.policy_version,
            quote_id=quote.id,
            merchant_id=quote.merchant_id,
            transaction_amount_paise=quote.total,
            currency=quote.currency,
            reasons=[],
            checks=checks,
            evaluated_at=now
        )
