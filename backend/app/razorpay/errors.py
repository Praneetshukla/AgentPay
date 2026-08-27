class RazorpayError(Exception):
    """Base exception for Razorpay integration errors."""
    def __init__(self, message: str, code: str = "RAZORPAY_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class RazorpayConfigError(RazorpayError):
    """Raised when Razorpay credentials or webhook secrets are missing or invalid."""
    def __init__(self, message: str):
        super().__init__(message, code="RAZORPAY_CONFIG_ERROR")


class RazorpayAPIError(RazorpayError):
    """Raised when the Razorpay API returns an error or communication fails."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message, code="RAZORPAY_API_ERROR")
        self.status_code = status_code


class WebhookSignatureError(RazorpayError):
    """Raised when Razorpay webhook HMAC signature verification fails."""
    def __init__(self, message: str = "Invalid Razorpay webhook signature"):
        super().__init__(message, code="INVALID_WEBHOOK_SIGNATURE")
