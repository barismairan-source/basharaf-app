<?php
/**
 * SEO responsibilities owned by the plugin.
 *
 * - WordPress core: <title>, canonical, robots, XML sitemap (/wp-sitemap.xml).
 * - SEO plugin (optional, one only): titles/descriptions/social tags/sitemap override.
 * - This class: LegalService JSON-LD on the front page from office settings,
 *   plus a basic meta description only when no known SEO plugin is active.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Structured data and fallback description.
 */
final class Dadvar_Core_SEO {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'page_excerpts' ) );
		add_action( 'wp_head', array( __CLASS__, 'meta_description' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'legal_service_schema' ), 20 );
	}

	/**
	 * Lets pages have an excerpt, used as the fallback meta description.
	 */
	public static function page_excerpts() {
		add_post_type_support( 'page', 'excerpt' );
	}

	/**
	 * Whether a full SEO plugin is handling meta output.
	 *
	 * @return bool
	 */
	public static function seo_plugin_active() {
		$active = defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || class_exists( 'The_SEO_Framework\Load', false );
		/**
		 * Filters whether an SEO plugin owns meta output.
		 *
		 * @param bool $active Detected state.
		 */
		return (bool) apply_filters( 'dadvar_seo_plugin_active', $active );
	}

	/**
	 * Basic meta description from the excerpt (or tagline on the front page).
	 */
	public static function meta_description() {
		if ( self::seo_plugin_active() || is_404() || is_search() ) {
			return;
		}
		$text = '';
		if ( is_front_page() ) {
			$text = get_bloginfo( 'description' );
		} elseif ( is_singular() ) {
			$post = get_queried_object();
			if ( $post instanceof WP_Post && ! post_password_required( $post ) ) {
				$text = has_excerpt( $post ) ? $post->post_excerpt : '';
			}
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$text = term_description();
		} elseif ( is_post_type_archive( Dadvar_Core_Post_Types::SERVICE ) ) {
			$object = get_post_type_object( Dadvar_Core_Post_Types::SERVICE );
			$text   = $object ? $object->description : '';
		}
		$text = trim( wp_strip_all_tags( (string) $text ) );
		if ( '' === $text ) {
			return;
		}
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( wp_html_excerpt( $text, 160, '…' ) ) );
	}

	/**
	 * Builds the LegalService object from filled settings only.
	 *
	 * @return array Empty when there is not enough real data.
	 */
	public static function legal_service_data() {
		$name = dadvar_office( 'office_name' );
		if ( '' === $name ) {
			return array();
		}
		$data  = array(
			'@context' => 'https://schema.org',
			'@type'    => 'LegalService',
			'@id'      => home_url( '/#legalservice' ),
			'name'     => $name,
			'url'      => home_url( '/' ),
		);
		$phone = dadvar_office( 'phone' ) ? dadvar_office( 'phone' ) : dadvar_office( 'mobile' );
		if ( $phone ) {
			$data['telephone'] = dadvar_latin_digits( $phone );
		}
		if ( dadvar_office( 'email' ) ) {
			$data['email'] = dadvar_office( 'email' );
		}
		if ( dadvar_office( 'address' ) || dadvar_office( 'city' ) ) {
			$address = array(
				'@type'          => 'PostalAddress',
				'addressCountry' => 'IR',
			);
			if ( dadvar_office( 'address' ) ) {
				$address['streetAddress'] = dadvar_office( 'address' );
			}
			if ( dadvar_office( 'city' ) ) {
				$address['addressLocality'] = dadvar_office( 'city' );
			}
			if ( dadvar_office( 'postal_code' ) ) {
				$address['postalCode'] = dadvar_latin_digits( dadvar_office( 'postal_code' ) );
			}
			$data['address'] = $address;
		}
		if ( dadvar_office( 'service_area' ) ) {
			$data['areaServed'] = dadvar_office( 'service_area' );
		}
		$logo_id = (int) get_theme_mod( 'custom_logo' );
		if ( $logo_id ) {
			$logo = wp_get_attachment_image_url( $logo_id, 'full' );
			if ( $logo ) {
				$data['logo']  = $logo;
				$data['image'] = $logo;
			}
		}
		$same_as = array_values( wp_list_pluck( dadvar_social_links(), 'url' ) );
		if ( $same_as ) {
			$data['sameAs'] = $same_as;
		}
		if ( dadvar_office( 'lawyer_name' ) && ! dadvar_is_multi_member() ) {
			$person = array(
				'@type' => 'Person',
				'name'  => dadvar_office( 'lawyer_name' ),
			);
			if ( dadvar_office( 'professional_title' ) ) {
				$person['jobTitle'] = dadvar_office( 'professional_title' );
			}
			$data['founder'] = $person;
		}
		$services = array();
		foreach ( Dadvar_Core_Post_Types::services() as $service ) {
			$services[] = array(
				'@type'       => 'Offer',
				'itemOffered' => array(
					'@type' => 'Service',
					'name'  => $service->post_title,
					'url'   => get_permalink( $service ),
				),
			);
		}
		if ( $services ) {
			$data['hasOfferCatalog'] = array(
				'@type'           => 'OfferCatalog',
				'name'            => 'خدمات',
				'itemListElement' => $services,
			);
		}
		/**
		 * Filters the LegalService structured data.
		 *
		 * @param array $data Schema.org data.
		 */
		return (array) apply_filters( 'dadvar_legal_service_schema', $data );
	}

	/**
	 * Prints LegalService JSON-LD on the front page.
	 */
	public static function legal_service_schema() {
		if ( ! is_front_page() || ! dadvar_office( 'schema_enabled' ) ) {
			return;
		}
		$data = self::legal_service_data();
		if ( ! $data ) {
			return;
		}
		echo '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . "</script>\n";
	}
}
