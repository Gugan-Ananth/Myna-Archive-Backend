import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip the session guard — login and health only. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
