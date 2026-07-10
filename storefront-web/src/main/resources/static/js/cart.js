/**
 * SimpleStore - Cart JavaScript
 * Handles Add to Cart, Update Quantity, Remove Item, and Clear Cart via AJAX.
 */
(function () {
    'use strict';

    // --- Toast Notification ---
    function showToast(message, type) {
        var toast = document.createElement('div');
        toast.className = 'toast' + (type ? ' toast-' + type : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // --- Update Cart Badge ---
    function updateCartBadge(count) {
        var badge = document.getElementById('cart-badge');
        if (badge) {
            badge.textContent = count;
            if (count > 0) {
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // --- Fetch cart count from response ---
    function refreshCartBadgeFromResponse(data) {
        if (data && typeof data.cartItemCount !== 'undefined') {
            updateCartBadge(data.cartItemCount);
        }
    }

    // --- Generic AJAX helper ---
    function ajaxPost(url, body, onSuccess, onError) {
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(body)
        })
            .then(function (response) {
                if (response.redirected) {
                    window.location.href = response.url;
                    return null;
                }
                if (!response.ok) {
                    throw new Error('Request failed with status ' + response.status);
                }
                var contentType = response.headers.get('Content-Type') || '';
                if (contentType.indexOf('application/json') !== -1) {
                    return response.json();
                }
                return response.text().then(function (text) {
                    try { return JSON.parse(text); }
                    catch (e) { return { success: true }; }
                });
            })
            .then(function (data) {
                if (data !== null && onSuccess) onSuccess(data);
            })
            .catch(function (err) {
                if (onError) onError(err);
                else showToast('Something went wrong. Please try again.', 'error');
            });

    // --- Add to Cart ---
    function initAddToCart() {
        var addToCartBtn = document.querySelector('.add-to-cart-btn');
        if (!addToCartBtn) return;

        addToCartBtn.addEventListener('click', function (e) {
            e.preventDefault();

            var productId = this.getAttribute('data-product-id');
            var quantityInput = document.getElementById('quantity');
            var quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

            if (!productId || quantity < 1) return;

            this.disabled = true;
            this.textContent = 'Adding...';

            var self = this;
            ajaxPost('/cart/add/' + productId, { quantity: quantity },
                function (data) {
                    self.disabled = false;
                    self.textContent = 'Add to Cart';
                    showToast('Item added to cart!', 'success');
                    refreshCartBadgeFromResponse(data);
                },
                function () {
                    self.disabled = false;
                    self.textContent = 'Add to Cart';
                    showToast('Failed to add item to cart.', 'error');
                }
            );
        });
    }

    // --- Update Quantity ---
    function initQuantityUpdate() {
        var updateButtons = document.querySelectorAll('.update-qty-btn');
        updateButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var form = this.closest('form');
                var input = form.querySelector('.quantity-input');
                var productId = input.getAttribute('data-product-id');
                var quantity = parseInt(input.value, 10);
                if (!productId || quantity < 1) return;

                ajaxPost('/cart/update/' + productId, { quantity: quantity }, function () {
                    window.location.reload();
                });
            });
        });
    }


    // --- Remove Item ---
    function initRemoveItem() {
        var removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (!confirm('Are you sure you want to remove this item from your cart?')) return;
                var productId = this.getAttribute('data-product-id');
                var row = this.closest('tr');
                ajaxPost('/cart/remove/' + productId, {},
                    function (data) {
                        if (row) {
                            row.style.opacity = '0.4';
                            row.style.transition = 'opacity 0.3s';
                        }
                        showToast('Item removed from cart.', 'success');
                        refreshCartBadgeFromResponse(data);
                        setTimeout(function () { window.location.reload(); }, 400);
                    }
                );
            });
        });
    }

    // --- Clear Cart ---
    function initClearCart() {
        var clearForm = document.querySelector('.clear-cart-form');
        if (!clearForm) return;
        clearForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to clear your entire cart?')) return;
            ajaxPost('/cart/clear', {},
                function () {
                    updateCartBadge(0);
                    showToast('Cart cleared.', 'success');
                    setTimeout(function () { window.location.reload(); }, 400);
                }
            );
        });
    }

    // --- Debounced Quantity Input ---
    function initQuantityInputDebounce() {
        var inputs = document.querySelectorAll('.cart-item-quantity .quantity-input, .quantity-form .quantity-input');
        inputs.forEach(function (input) {
            var debounceTimer;
            input.addEventListener('change', function () {
                clearTimeout(debounceTimer);
                var self = this;
                debounceTimer = setTimeout(function () {
                    var form = self.closest('form');
                    if (form) {
                        var btn = form.querySelector('.update-qty-btn');
                        if (btn) btn.click();
                    }
                }, 600);
            });
        });
    }

    // --- Initialize ---
    function init() {
        initAddToCart();
        initQuantityUpdate();
        initRemoveItem();
        initClearCart();
        initQuantityInputDebounce();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

    }
