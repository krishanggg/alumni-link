-- setup.bat uses this definition automatically when the configured database is
-- missing. Run it manually only when the configured account cannot create it.
CREATE DATABASE IF NOT EXISTS `alumnilink`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
