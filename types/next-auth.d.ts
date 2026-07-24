import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
    user: {
      worker_id: string
      worker_role: string
      worker_name: string
      worker_shop_name: string
      worker_shop_image: string
    } & DefaultSession["user"]
  }

  interface User {
    accessToken: string
    worker_id: string
    worker_role: string
    worker_name: string
    worker_shop_name: string
    worker_shop_image: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    worker_id: string
    worker_role: string
    worker_name: string
    worker_shop_name: string
    worker_shop_image: string
  }
}
