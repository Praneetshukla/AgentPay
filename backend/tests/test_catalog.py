import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_agent_manifest_discovery(async_client: AsyncClient):
    """
    Verify the .well-known agent discovery endpoint returns capabilities and constraints.
    """
    response = await async_client.get("/.well-known/agent-catalog.json")
    assert response.status_code == 200
    data = response.json()
    assert data["merchant_id"] == "merch_agentpay_demo"
    assert data["currency"] == "INR"
    assert "catalog" in data["endpoints"]
    assert "cart_quote" in data["endpoints"]
    assert "authoritative_cart_quoting" in data["capabilities"]
    assert data["purchase_constraints"]["max_items_per_cart"] == 50


@pytest.mark.asyncio
async def test_list_catalog_and_filtering(async_client: AsyncClient):
    """
    Verify listing products, searching by text, and filtering by category.
    """
    # 1. Full active catalog
    response = await async_client.get("/agent/catalog")
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 6

    # 2. Filter by category
    resp_cat = await async_client.get("/agent/catalog?category=Keyboards")
    assert resp_cat.status_code == 200
    cat_items = resp_cat.json()
    assert len(cat_items) == 1
    assert cat_items[0]["sku"] == "KB-MECH-001"

    # 3. Search query
    resp_search = await async_client.get("/agent/catalog?search=webcam")
    assert resp_search.status_code == 200
    search_items = resp_search.json()
    assert len(search_items) == 1
    assert search_items[0]["sku"] == "CAM-4K-005"

    # 4. Filter by stock availability
    resp_avail = await async_client.get("/agent/catalog?available_only=true")
    assert resp_avail.status_code == 200
    avail_items = resp_avail.json()
    # HEADSET-ANC-006 is out of stock (0 stock), should be excluded
    skus = [p["sku"] for p in avail_items]
    assert "HEADSET-ANC-006" not in skus


@pytest.mark.asyncio
async def test_get_product_by_sku(async_client: AsyncClient):
    """
    Verify SKU lookup and 404 on nonexistent SKU.
    """
    response = await async_client.get("/agent/products/KB-MECH-001")
    assert response.status_code == 200
    product = response.json()
    assert product["sku"] == "KB-MECH-001"
    assert product["price"] == 649900

    # Nonexistent SKU
    resp_not_found = await async_client.get("/agent/products/NON-EXISTENT-SKU")
    assert resp_not_found.status_code == 404
