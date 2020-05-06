/*
	Epilogue by TEMPLATED
	templated.co @templatedco
	Released for free under the Creative Commons Attribution 3.0 license (templated.co/license)
*/

(function($) {

	skel.breakpoints({
		xlarge: '(max-width: 1680px)',
		large: '(max-width: 1280px)',
		medium: '(max-width: 980px)',
		small: '(max-width: 736px)',
		xsmall: '(max-width: 480px)',
		xxsmall: '(max-width: 360px)'
	});

	$(function() {

		var	$window = $(window),
			$body = $('body');

		// Disable animations/transitions until the page has loaded.
			$body.addClass('is-loading');

			$window.on('load', function() {
				window.setTimeout(function() {
					$body.removeClass('is-loading');
				}, 100);
			});

		// Fix: Placeholder polyfill.
			$('form').placeholder();

		// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize(
					'.important\\28 medium\\29',
					skel.breakpoint('medium').active
				);
			});
    });
    
    let currentTimeout;
    $( document ).on( "scroll", () => {
        if ( currentTimeout ) clearTimeout( currentTimeout )
        const value = window.scrollY / ( $(document).height() - window.innerHeight )
        currentTimeout = setTimeout( () => {
            gtag( "event", "scroll", { value })
            fbq( "trackCustom", "scroll", { value })
        }, 250 )
    })

    let heartbeartInterval = setInterval( () => gtag( "event", "heartbeat" ), 10000 );
    $( document ).on( "visibilitychange", () => {
        clearInterval( heartbeartInterval ) 
        if ( !document.hidden ) heartbeartInterval = setInterval( () => {
            gtag( "event", "heartbeat" )
            fbq( "trackCustom", "hearbeat" )
        }, 10000 )
    })

})(jQuery);

const faqToggle = id => {
    $span = $( `#${ id } span` )
    $p = $( `#${ id } p` )

    if ( $span.hasClass( "fa-plus-square" ) ) {
        $span.removeClass( "fa-plus-square" ).addClass( "fa-minus-square" );
        $p.show( 500 )
        gtag( "event", "faq-open", { value: id })
        fbq( "trackCustom", "faq-open", { value: id })
    } else {
        $span.removeClass( "fa-minus-square" ).addClass( "fa-plus-square" );
        $p.hide( 200 )
    }
}
