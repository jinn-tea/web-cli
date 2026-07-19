/**
 * SOURCE CATALOG — the single source of truth for every user-facing string.
 *
 * Add new keys HERE first; TypeScript then forces every other locale catalog to
 * add them too (each is declared `satisfies Messages`), so a translation can
 * never silently go missing.
 *
 * Interpolate with `{name}` placeholders: `t("dashboard.welcome", { name })`.
 *
 * ⚠️ Deliberately NOT `as const`. The key PATHS are what `MessageKey` is built
 * from, and those stay literal either way — but `as const` would also make each
 * VALUE a literal type (`"Save"` rather than `string`), and then no translation
 * could ever satisfy `Messages`: German "Speichern" isn't assignable to `"Save"`.
 */
const en = {
  common: {
    actions: {
      save: "Save",
      cancel: "Cancel",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      confirm: "Confirm",
      close: "Close",
      search: "Search",
      retry: "Try again",
      back: "Back",
      next: "Next",
      copy: "Copy",
      copied: "Copied",
      clear: "Clear",
      viewAll: "View all",
    },
    states: {
      loading: "Loading…",
      noResults: "No results",
      noResultsHint: "Try a different search or filter.",
      errorTitle: "Something went off track",
      errorHint: "The request didn't go through. You can try again.",
      notFoundTitle: "Page not found",
      notFoundHint: "The page you're looking for doesn't exist or has moved.",
    },
    pagination: {
      summary: "{from}–{to} of {total}",
      previous: "Previous",
      next: "Next",
      page: "Page {page} of {pages}",
      rowsPerPage: "Rows per page",
    },
    table: {
      columns: "Columns",
      sortAscending: "Sort ascending",
      sortDescending: "Sort descending",
      selected: "{count} selected",
      openMenu: "Open menu",
    },
    confirm: {
      deleteTitle: "Delete this item?",
      deleteDescription: "This can't be undone.",
    },
    language: "Language",
    theme: "Theme",
  },

  nav: {
    dashboard: "Dashboard",
    settings: "Settings",
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    commandMenu: "Search commands",
    account: "Account",
    signOut: "Sign out",
  },

  roles: {
    admin: "Admin",
    member: "Member",
  },

  auth: {
    login: {
      title: "Sign in",
      subtitle: "Enter your details to continue.",
      submit: "Sign in",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      signUp: "Create one",
      success: "Welcome back",
    },
    register: {
      title: "Create your account",
      subtitle: "It only takes a minute.",
      submit: "Create account",
      hasAccount: "Already have an account?",
      signIn: "Sign in",
    },
    forgotPassword: {
      title: "Reset your password",
      subtitle: "We'll email you a link to set a new one.",
      submit: "Send reset link",
      sent: "Check your inbox for the reset link.",
    },
    resetPassword: {
      title: "Choose a new password",
      submit: "Update password",
      success: "Password updated. You can sign in now.",
    },
    fields: {
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      name: "Full name",
      phone: "Phone",
    },
    sessionExpired: "Your session expired. Please sign in again.",
    signedOut: "You've been signed out.",
  },

  validation: {
    required: "This field is required",
    email: "Enter a valid email address",
    minLength: "Must be at least {min} characters",
    maxLength: "Must be at most {max} characters",
    passwordWeak: "Use at least 8 characters, with a letter and a number",
    passwordMismatch: "Passwords don't match",
    phone: "Enter a valid phone number",
    url: "Enter a valid URL",
    number: "Enter a number",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Can't reach the server. Check your connection.",
    unauthorized: "You don't have access to this.",
    notFound: "We couldn't find what you were looking for.",
    validation: "Please check the highlighted fields.",
  },

  dashboard: {
    title: "Dashboard",
    welcome: "Welcome back, {name}",
    adminSubtitle: "Everything across the workspace.",
    memberSubtitle: "Your work at a glance.",
    empty: "Nothing here yet",
    emptyHint: "Once there's activity, it'll show up here.",
  },

  settings: {
    title: "Settings",
    subtitle: "Manage your account and preferences.",
    profile: "Profile",
    profileHint: "Your name and contact details.",
    preferences: "Preferences",
    preferencesHint: "Language and display options.",
    danger: "Danger zone",
    signOutHint: "Sign out of this device.",
  },
  orders: {
    title: "Orders",
    subtitle: "Every order across the workspace.",
    create: "New order",
    createTitle: "New order",
    editTitle: "Edit order",
    formHint: "Orders sync to the backend as soon as you save.",
    searchPlaceholder: "Search by reference or customer",
    empty: "No orders yet",
    emptyHint: "Orders appear here as soon as the first one is placed.",
    deleteTitle: "Delete this order?",
    created: "Order created",
    updated: "Order updated",
    deleted: "Order deleted",
    columns: {
      reference: "Reference",
      customer: "Customer",
      status: "Status",
      total: "Total",
      created: "Created",
    },
    status: {
      draft: "Draft",
      pending: "Pending",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    },
  },
  // codeable-web:i18n — the `domain` generator appends new namespaces here.
};

export default en;
