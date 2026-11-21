import { registerAction } from "../actions";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <AuthForm mode="register" action={registerAction} />
  );
}
