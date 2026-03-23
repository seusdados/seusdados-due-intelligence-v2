export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Login URL — always local auth
export const getLoginUrl = () => "/login";

export const getInviteLoginUrl = (email: string) => "/login";
