export const config = {
  port: process.env.PORT || 3000,
  template_dir_location: "root",
  public_dir_location: "public",
  data_dir_location: "data",
  log_dir_location: "log",
  root_file: "index.sivu",
  use_layout_file: true,
  public_asset_caching_time: "1d",
  cache_compiled_templates: false, // toggle on for smaller CPU cost
  cache_scripts: false,
  force_csrf_middleware: true,
  autoescape_html: true,
  allow_pretty_urls: true,
  session_secret: process.env.SESSION_SECRET || "thisismysecret",
  cookie_secure: false, // requires https
  sqlite_wal_mode: true
};