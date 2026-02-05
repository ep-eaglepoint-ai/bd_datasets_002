import pytest
from playwright.sync_api import Page, expect
import os

# Path to the target index.html (repository_before or repository_after)
TARGET = os.getenv("TEST_TARGET", "repository_after")
FILE_PATH = "file://" + os.path.abspath(f"{TARGET}/index.html")

@pytest.mark.parametrize("width, name", [
    (375, "Mobile"),
    (768, "Tablet"),
    (1024, "Desktop-Small"),
    (1440, "Desktop-Original")
])
def test_pricing_cards_centering(page: Page, width: int, name: str):
    """Verify that pricing cards are centered horizontally at different breakpoints."""
    page.set_viewport_size({"width": width, "height": 1000})
    page.goto(FILE_PATH)
    
    # Wait for the pricing section to be visible
    pricing_grid = page.locator(".pricing-grid")
    expect(pricing_grid).to_be_visible()
    
    cards = page.locator(".price-card")
    count = cards.count()
    
    viewport_center = width / 2
    
    for i in range(count):
        card = cards.nth(i)
        box = card.bounding_box()
        assert box is not None
        
        card_center = box["x"] + box["width"] / 2
        
        # In a 3-column grid (Desktop), they won't all be at the viewport center relative to x=0.
        # But in a single-column stack (Mobile/Tablet), they SHOULD be centered.
        if width < 1024:
            # Tolerant center check (allow 1px rounding difference)
            assert abs(card_center - viewport_center) <= 1.0, f"Card {i+1} is not centered on {name}. Center: {card_center}, Viewport Center: {viewport_center}"
        else:
            # On Desktop Small/Large, they should be in a grid.
            # Card 2 (middle) should still be centered if it's a 3-column grid.
            if i == 1:
                assert abs(card_center - viewport_center) <= 1.0, f"Middle card is not centered on {name}. Center: {card_center}, Viewport Center: {viewport_center}"

@pytest.mark.parametrize("width", [1440])
def test_desktop_absolute_positioning(page: Page, width: int):
    """Verify that at 1440px, elements return to their original absolute positions."""
    page.set_viewport_size({"width": width, "height": 3000})
    page.goto(FILE_PATH)
    
    # Original absolute positions from repository_before:
    # .price-card-1 { top: 200px; left: 180px; width: 340px; }
    # .price-card-2 { top: 180px; left: 550px; width: 340px; }
    # .price-card-3 { top: 200px; left: 920px; width: 340px; }
    
    card1 = page.locator(".price-card-1")
    box1 = card1.bounding_box()
    assert box1["y"] == 1780 
    assert box1["x"] == 180
    assert box1["width"] == 340
    
    card2 = page.locator(".price-card-2")
    box2 = card2.bounding_box()
    assert box2["y"] == 1760
    assert box2["x"] == 550
    assert box2["width"] == 340

def test_hero_image_order_on_mobile(page: Page):
    """Verify that the hero image appears below the text on mobile (order manipulation)."""
    page.set_viewport_size({"width": 375, "height": 1000})
    page.goto(FILE_PATH)
    
    hero_content = page.locator(".hero-content").bounding_box()
    hero_image = page.locator(".hero-image").bounding_box()
    
    # On mobile, the image should be further down the page (greater y) than the content
    assert hero_image["y"] > hero_content["y"], "Hero image should be below content on mobile"

def test_touch_target_sizes_on_mobile(page: Page):
    """Verify that all navigation links and buttons meet accessibility touch target sizes (min 44px)."""
    page.set_viewport_size({"width": 375, "height": 1000})
    page.goto(FILE_PATH)
    
    # Check nav links
    links = page.locator(".nav-links a")
    for i in range(links.count()):
        box = links.nth(i).bounding_box()
        assert box["height"] >= 44, f"Nav link {i} height {box['height']} is less than 44px"
        
    # Check buttons
    buttons = page.locator("button")
    for i in range(buttons.count()):
        box = buttons.nth(i).bounding_box()
        # Some small buttons might be narrow, but they should be at least 44px tall
        assert box["height"] >= 44, f"Button {i} height {box['height']} is less than 44px"
