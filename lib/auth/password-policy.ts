export const minimumPasswordLength = 12;
export const maximumPasswordLength = 128;

export function getPasswordPolicyError(password: string) {
  if (password.length < minimumPasswordLength) {
    return `La contrasena debe tener al menos ${minimumPasswordLength} caracteres.`;
  }

  if (password.length > maximumPasswordLength) {
    return `La contrasena no puede superar ${maximumPasswordLength} caracteres.`;
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Incluye al menos una letra mayuscula y una minuscula.";
  }

  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Incluye al menos un numero y un simbolo.";
  }

  return null;
}
