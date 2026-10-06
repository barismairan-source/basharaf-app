<?php
/**
 * Uninstall: content and settings are deliberately kept.
 *
 * Services, members, consultation requests and office settings live in the
 * database and survive plugin deletion, so reinstalling restores everything.
 * To erase consultation requests, use Tools → Erase Personal Data or delete
 * them from «درخواست‌ها» before uninstalling.
 *
 * @package Dadvar_Core
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

wp_clear_scheduled_hook( 'dadvar_purge_inquiries' );
