export function firebaseAuthMessage(e: unknown): string {
  const err = e as any;
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "Email/ SĐT này đã được sử dụng";
  if (code.includes("invalid-email")) return "Email không hợp lệ";
  if (code.includes("weak-password")) return "Mật khẩu quá yếu";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Thông tin đăng nhập không đúng";
  }
  if (code.includes("too-many-requests")) return "Quá nhiều yêu cầu, vui lòng thử lại sau";
  if (code.includes("phone-account-reset-not-allowed")) {
    return "Tài khoản đăng ký bằng số điện thoại không thể tự khôi phục qua email. Vui lòng liên hệ quản trị viên để được hỗ trợ đặt lại mật khẩu.";
  }
  return err?.message || "Đã xảy ra lỗi";
}
