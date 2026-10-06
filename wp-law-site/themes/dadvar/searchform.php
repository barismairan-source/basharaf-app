<?php
/**
 * Accessible search form.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

$dadvar_search_id = wp_unique_id( 'search-' );
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label for="<?php echo esc_attr( $dadvar_search_id ); ?>">جست‌وجو در سایت</label>
	<div class="search-form__row">
		<input type="search" id="<?php echo esc_attr( $dadvar_search_id ); ?>" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="مثلاً مهریه یا قرارداد">
		<button type="submit" class="dv-button dv-button--solid">جست‌وجو</button>
	</div>
</form>
