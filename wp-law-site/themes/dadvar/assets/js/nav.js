/**
 * Mobile navigation disclosure: aria-expanded, Escape to close, close on outside click.
 */
( function () {
	'use strict';

	var toggle = document.querySelector( '.nav-toggle' );
	var nav = document.getElementById( 'site-nav' );
	if ( ! toggle || ! nav ) {
		return;
	}

	function setOpen( open ) {
		toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
		nav.classList.toggle( 'is-open', open );
	}

	toggle.addEventListener( 'click', function () {
		setOpen( toggle.getAttribute( 'aria-expanded' ) !== 'true' );
	} );

	document.addEventListener( 'keydown', function ( event ) {
		if ( event.key === 'Escape' && toggle.getAttribute( 'aria-expanded' ) === 'true' ) {
			setOpen( false );
			toggle.focus();
		}
	} );

	document.addEventListener( 'click', function ( event ) {
		if ( toggle.getAttribute( 'aria-expanded' ) === 'true' && ! nav.contains( event.target ) && ! toggle.contains( event.target ) ) {
			setOpen( false );
		}
	} );

	// Close the panel when the layout switches to desktop.
	var desktop = window.matchMedia( '(min-width: 1025px)' );
	var onChange = function () {
		if ( desktop.matches ) {
			setOpen( false );
		}
	};
	if ( desktop.addEventListener ) {
		desktop.addEventListener( 'change', onChange );
	}
}() );
