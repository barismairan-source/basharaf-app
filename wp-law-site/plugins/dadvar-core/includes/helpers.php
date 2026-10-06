<?php
/**
 * Public helper functions. Themes may call these; always guard with function_exists().
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Returns one office setting (the single source for phone, address, hours, ...).
 *
 * @param string $key     Field key, see Dadvar_Core_Settings::fields().
 * @param mixed  $fallback Value when the field is empty.
 * @return mixed
 */
function dadvar_office( $key, $fallback = '' ) {
	$values = Dadvar_Core_Settings::get_all();
	if ( isset( $values[ $key ] ) && '' !== $values[ $key ] && null !== $values[ $key ] ) {
		return $values[ $key ];
	}
	return $fallback;
}

/**
 * Converts Persian and Arabic-Indic digits to ASCII digits.
 *
 * @param string $value Input.
 * @return string
 */
function dadvar_latin_digits( $value ) {
	$persian = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
	$arabic  = array( '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' );
	$latin   = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
	return str_replace( $arabic, $latin, str_replace( $persian, $latin, (string) $value ) );
}

/**
 * Converts ASCII digits to Persian digits for display.
 *
 * @param string $value Input.
 * @return string
 */
function dadvar_fa_digits( $value ) {
	$latin   = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
	$persian = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
	return str_replace( $latin, $persian, (string) $value );
}

/**
 * Builds a tel: URI from a phone number typed in any digit system.
 *
 * @param string $phone Phone as entered by the site manager.
 * @return string Empty string when the number has no digits.
 */
function dadvar_tel_href( $phone ) {
	$phone  = dadvar_latin_digits( $phone );
	$plus   = 0 === strpos( ltrim( $phone ), '+' ) ? '+' : '';
	$digits = preg_replace( '/\D+/', '', $phone );
	return '' === $digits ? '' : 'tel:' . $plus . $digits;
}

/**
 * Converts a Gregorian date to Jalali (Solar Hijri).
 *
 * @param int $gy Gregorian year.
 * @param int $gm Gregorian month (1-12).
 * @param int $gd Gregorian day.
 * @return int[] Array of year, month, day.
 */
function dadvar_gregorian_to_jalali( $gy, $gm, $gd ) {
	$g_d_m = array( 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 );
	$gy2   = ( $gm > 2 ) ? ( $gy + 1 ) : $gy;
	$days  = 355666 + ( 365 * $gy ) + intdiv( $gy2 + 3, 4 ) - intdiv( $gy2 + 99, 100 ) + intdiv( $gy2 + 399, 400 ) + $gd + $g_d_m[ $gm - 1 ];
	$jy    = -1595 + ( 33 * intdiv( $days, 12053 ) );
	$days %= 12053;
	$jy   += 4 * intdiv( $days, 1461 );
	$days %= 1461;
	if ( $days > 365 ) {
		$jy  += intdiv( $days - 1, 365 );
		$days = ( $days - 1 ) % 365; // phpcs:ignore Squiz.Operators.IncrementDecrementUsage -- algorithm step, not a decrement.
	}
	if ( $days < 186 ) {
		$jm = 1 + intdiv( $days, 31 );
		$jd = 1 + ( $days % 31 );
	} else {
		$jm = 7 + intdiv( $days - 186, 30 );
		$jd = 1 + ( ( $days - 186 ) % 30 );
	}
	return array( $jy, $jm, $jd );
}

/**
 * Formats a timestamp as a Persian Jalali date, e.g. «۱۴ مهر ۱۴۰۵».
 *
 * @param int $timestamp Unix timestamp (UTC).
 * @return string
 */
function dadvar_jalali_date( $timestamp ) {
	$months               = array( 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند' );
	$local                = wp_date( 'Y-n-j', (int) $timestamp );
	list( $y, $m, $d )    = array_map( 'intval', explode( '-', $local ) );
	list( $jy, $jm, $jd ) = dadvar_gregorian_to_jalali( $y, $m, $d );
	return dadvar_fa_digits( $jd . ' ' . $months[ $jm - 1 ] . ' ' . $jy );
}

/**
 * Returns configured social profiles as [ key => [ label, url ] ].
 *
 * @return array
 */
function dadvar_social_links() {
	$networks = array(
		'instagram' => 'اینستاگرام',
		'telegram'  => 'تلگرام',
		'whatsapp'  => 'واتس‌اپ',
		'linkedin'  => 'لینکدین',
		'x'         => 'ایکس',
		'eitaa'     => 'ایتا',
		'bale'      => 'بله',
	);
	$links    = array();
	foreach ( $networks as $key => $label ) {
		$url = dadvar_office( 'social_' . $key );
		if ( $url ) {
			$links[ $key ] = array(
				'label' => $label,
				'url'   => $url,
			);
		}
	}
	return $links;
}

/**
 * Whether the site is configured as a multi-member office.
 *
 * @return bool
 */
function dadvar_is_multi_member() {
	return (bool) dadvar_office( 'multi_member', false );
}
