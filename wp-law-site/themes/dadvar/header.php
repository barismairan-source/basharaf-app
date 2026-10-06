<?php
/**
 * Document head and site header.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;
?>
<!doctype html>
<html <?php language_attributes(); ?> class="no-js">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_print_inline_script_tag( "document.documentElement.classList.replace('no-js','js');" ); ?>
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#content">پرش به محتوای اصلی</a>
<?php
if ( ! dadvar_theme_do_location( 'header' ) ) {
	get_template_part( 'template-parts/header/site-header' );
}
