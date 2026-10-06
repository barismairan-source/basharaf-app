<?php
/**
 * Page header: breadcrumbs, title and optional description.
 *
 * @package Dadvar
 *
 * @var array $args { title: string, description: string }
 */

defined( 'ABSPATH' ) || exit;

$dadvar_args = wp_parse_args(
	isset( $args ) ? $args : array(),
	array(
		'title'       => '',
		'description' => '',
	)
);
?>
<header class="page-header">
	<div class="container">
		<?php dadvar_theme_breadcrumbs(); ?>
		<h1 class="page-header__title"><?php echo esc_html( $dadvar_args['title'] ); ?></h1>
		<?php if ( $dadvar_args['description'] ) : ?>
			<div class="page-header__desc"><?php echo wp_kses_post( wpautop( $dadvar_args['description'] ) ); ?></div>
		<?php endif; ?>
	</div>
</header>
