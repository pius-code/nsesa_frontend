import { DefaultSession } from "next-auth"

export interface WorkerPermissions {
  is_global: boolean
  can_sell: boolean
  can_manage_orders: boolean
  view_own_transactions: boolean
  view_all_transactions: boolean
  can_add_inventory: boolean
  can_update_stock: boolean
  can_add_others: boolean
  can_manage_expenses: boolean
  can_view_own_branch_report: boolean
  can_view_all_reports: boolean
  can_view_specific_branches: string[]
  can_add_categories: boolean
  can_sms_own_branch: boolean
  can_sms_all_branches: boolean
  can_see_clients: boolean
  can_add_clients: boolean
  can_edit_clients: boolean
}

declare module "next-auth" {
  interface Session {
    accessToken: string
    user: {
      worker_id: string
      worker_role: string
      role_label: string
      worker_name: string
      worker_shop_name: string
      worker_branch_name?: string | null
      worker_shop_image: string
      permissions: WorkerPermissions
    } & DefaultSession["user"]
  }

  interface User {
    accessToken: string
    worker_id: string
    worker_role: string
    role_label: string
    worker_name: string
    worker_shop_name: string
    worker_branch_name?: string | null
    worker_shop_image: string
    permissions: WorkerPermissions
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    worker_id: string
    worker_role: string
    role_label: string
    worker_name: string
    worker_shop_name: string
    worker_branch_name?: string | null
    worker_shop_image: string
    permissions: WorkerPermissions
  }
}
