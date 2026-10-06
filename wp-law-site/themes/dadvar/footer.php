<?php
/**
 * Site footer and closing markup.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

if ( ! dadvar_theme_do_location( 'footer' ) ) {
	get_template_part( 'template-parts/footer/site-footer' );
}
wp_footer();
?>
</body>
</html>
