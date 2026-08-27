from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Product, Policy

DEMO_PRODUCTS = [
    {
        "sku": "KB-MECH-001",
        "name": "ProKey Wireless Mechanical Keyboard",
        "description": "75% compact wireless mechanical keyboard with hot-swappable switches and RGB backlighting.",
        "category": "Keyboards",
        "price": 249900,  # ₹2,499.00 (Standard Allowable Tier)
        "currency": "INR",
        "stock_quantity": 25,
        "version": 1,
        "attributes": {"switch_type": "Gateron Brown", "connectivity": "Bluetooth / 2.4GHz / USB-C", "color": "Slate Gray"},
        "active": True,
    },
    {
        "sku": "MOUSE-WL-002",
        "name": "PrecisionFlow Wireless Mouse",
        "description": "Ergonomic high-precision wireless productivity mouse with dual scroll wheels and 4000 DPI sensor.",
        "category": "Mice",
        "price": 129900,  # ₹1,299.00
        "currency": "INR",
        "stock_quantity": 40,
        "version": 1,
        "attributes": {"sensor": "Optical 4000 DPI", "battery_life": "70 days", "connectivity": "Bluetooth / 2.4GHz"},
        "active": True,
    },
    {
        "sku": "HUB-USBC-003",
        "name": "PowerPort 8-in-1 USB-C Hub",
        "description": "Aluminum USB-C multiport adapter with 4K HDMI, 100W Power Delivery, SD reader, and Gigabit Ethernet.",
        "category": "Adapters & Hubs",
        "price": 289900,  # ₹2,899.00
        "currency": "INR",
        "stock_quantity": 18,
        "version": 1,
        "attributes": {"ports": ["4K HDMI", "100W PD", "Gigabit LAN", "SD/TF", "3x USB 3.0"], "material": "Space Gray Aluminum"},
        "active": True,
    },
    {
        "sku": "STAND-ALUM-004",
        "name": "ErgoLift Aluminum Laptop Stand",
        "description": "Adjustable ventilated aluminum riser for 10-16 inch laptops and MacBooks.",
        "category": "Desk Accessories",
        "price": 179900,  # ₹1,799.00
        "currency": "INR",
        "stock_quantity": 30,
        "version": 1,
        "attributes": {"compatibility": "10-16 inch", "max_load": "10kg", "material": "Anodized Aluminum"},
        "active": True,
    },
    {
        "sku": "CAM-4K-005",
        "name": "ClearView 4K HDR Pro Webcam",
        "description": "Ultra HD 4K webcam with dual noise-canceling AI microphones and autofocus.",
        "category": "Cameras",
        "price": 349900,  # ₹3,499.00 (Triggers REQUIRE_CONFIRMATION since >= ₹3,000)
        "currency": "INR",
        "stock_quantity": 12,
        "version": 1,
        "attributes": {"resolution": "4K 30fps / 1080p 60fps", "field_of_view": "90 degrees", "mic": "Dual Stereo"},
        "active": True,
    },
    {
        "sku": "HEADSET-ANC-006",
        "name": "SoundShield ANC Wireless Headphones",
        "description": "Active Noise Cancelling over-ear headphones with 40-hour battery life and spatial audio.",
        "category": "Audio",
        "price": 699900,  # ₹6,999.00 (Exceeds ₹5,000 spending limit -> AMOUNT_EXCEEDS_LIMIT)
        "currency": "INR",
        "stock_quantity": 0,  # Intentionally Out of Stock
        "version": 1,
        "attributes": {"anc": "Hybrid 35dB", "battery": "40 hours", "driver": "40mm Beryllium"},
        "active": True,
    },
    {
        "sku": "CABLE-TB4-007",
        "name": "ThunderBolt 4 Ultra High-Speed Cable (1m)",
        "description": "40Gbps data transfer, 100W charging, 8K video output.",
        "category": "Cables",
        "price": 149900,  # ₹1,499.00
        "currency": "INR",
        "stock_quantity": 50,
        "version": 1,
        "attributes": {"bandwidth": "40Gbps", "length": "1 meter", "power_delivery": "100W"},
        "active": True,
    },
    {
        "sku": "LUX-WATCH-008",
        "name": "Titanium Smartwatch Pro",
        "description": "Luxury connected smartwatch with sapphire glass and titanium casing.",
        "category": "Luxury Goods",  # Category outside allowed list
        "price": 450000,  # ₹4,500.00
        "currency": "INR",
        "stock_quantity": 10,
        "version": 1,
        "attributes": {"material": "Grade 5 Titanium"},
        "active": True,
    },
    {
        "sku": "BLOCKED-ITEM-009",
        "name": "Restricted Industrial Laser Pointer",
        "description": "High powered laser device restricted from autonomous purchase.",
        "category": "Electronics",
        "price": 199900,  # ₹1,999.00
        "currency": "INR",
        "stock_quantity": 5,
        "version": 1,
        "attributes": {"class": "Class 3B"},
        "active": True,
    }
]

DEMO_POLICY = {
    "id": "policy_demo",
    "merchant_id": "merch_agentpay_demo",
    "currency": "INR",
    "max_transaction_amount": 500000,  # ₹5,000.00 max spending cap
    "max_cart_items": 5,              # Maximum 5 total items in cart
    "max_quantity_per_sku": 2,        # Maximum 2 units of any single SKU
    "allowed_categories": [           # Allowed merchant product categories
        "Keyboards",
        "Mice",
        "Adapters & Hubs",
        "Desk Accessories",
        "Cameras",
        "Cables",
        "Electronics",
        "Workstation"
    ],
    "allowed_skus": [],               # Empty list = any non-blocked SKU allowed
    "blocked_skus": [                 # Explicitly blocked SKUs
        "BLOCKED-ITEM-009"
    ],
    "confirmation_threshold": 300000, # ₹3,000.00 (Transactions >= ₹3,000 require human confirmation)
    "policy_version": 1,
    "active": True,
}


def seed_demo_catalog(db: Session) -> None:
    """
    Deterministically populate demo catalog products and demo spending policy.
    """
    # Seed Products
    for item in DEMO_PRODUCTS:
        existing = db.query(Product).filter(Product.sku == item["sku"]).first()
        if not existing:
            product = Product(**item)
            db.add(product)
        else:
            for key, val in item.items():
                setattr(existing, key, val)
                
    # Seed Policy
    existing_policy = db.query(Policy).filter(Policy.id == DEMO_POLICY["id"]).first()
    if not existing_policy:
        policy = Policy(**DEMO_POLICY)
        db.add(policy)
    else:
        for key, val in DEMO_POLICY.items():
            setattr(existing_policy, key, val)

    db.commit()
