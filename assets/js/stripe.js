
const url = "https://stripe-server-xdzmzxo7uq-lz.a.run.app/";
const stripe = Stripe('pk_test_Fl19stXoPXnQwM41LT9VQ3Gi00SQ1ugcZp');

const style = {
    base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': { color: '#aab7c4' },
    },
    invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
    },
};

const openCheckout = async () => {
    const isAlreadyOpen = $( "#checkout" ).length > 0;
    if ( isAlreadyOpen ) return;

    gtag( "event", "begin-checkout" )

    $( "body" ).append( `
        <div class="modal" id="checkout">
            <div class="content">
                <div>
                    <h4>Adultletics Running Club Subscription</h4>
                    <p>You get...</p>
                    <p><strong>$23 AUD per week, no lock in contracts</strong></p>
                </div>
                <form id="subscription-form">
                    <div class="customer-details">
                        <div>
                            <label>Name</label>
                            <input type="text" required placeholder="Please enter your full name"></input>
                        </div>
                        <div>
                            <label>Email</label>
                            <input type="email" required placeholder="Please enter your email"></input>
                        </div>
                    </div>
                    <div>
                        <label>Card</label>
                        <div id="card-element" class="stripe-card"></div>
                    </div>
                    <div id="card-errors" role="alert"></div>
                    <div>
                        <button type="submit" id="submit-button" style='margin-top: 1em;'>
                            Join
                            <i id='button-loader' class='fas fa-check' style='margin-left: 8px;'></i>
                        </button>
                    </div>
                </form>
            </div>
            <div class="background"><i class="far fa-times-circle fa-2x" style="color: white;"></i></div>
        </div>
    ` );

    $( "#checkout > .background" ).on( "click", () => $( "#checkout" ).remove())

    const elements = stripe.elements();
      
    const cardElement = elements.create('card', { style });
    cardElement.mount('#card-element');

    cardElement.addEventListener('change', event => {
        const displayError = document.getElementById( 'card-errors' );
        if ( event.error ) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
    });

    const form = document.getElementById('subscription-form');
    form.addEventListener('submit', event => {
        event.preventDefault();
        $( "#button-loader" ).removeClass( "fa-check" ).addClass( "fa-spin fa-spinner" )
        $( "#submit-button" ).prop( "disabled", true )
        const name = event.target[0].value
        const email = event.target[1].value
        stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                email,
                name,
            },
        }).then( submitSubscription );
    });
}

const submitSubscription = async data => {
    const { paymentMethod } = data
    if ( data.error ) {
        console.error( "Stripe Error:", data.error )
    } else {
        try {
            const { billing_details, id } = paymentMethod
            const response = await fetch( url, {
                method: 'post',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    billing_details,
                    payment_method: id,
                }),
            })

            const subscription = await response.json()
            const { latest_invoice } = subscription;
            const { payment_intent } = latest_invoice;

            if ( payment_intent ) {
                const { client_secret, status } = payment_intent;
                if ( status === 'requires_action' ) {
                    const result = await stripe.confirmCardPayment( client_secret )
                    if ( result.error ) {
                        const displayError = document.getElementById( 'card-errors' );
                        displayError.textContent = `Card declined due to ${ result.error.decline_code.replace( "_", " " ) }. Please try again!`;
                        $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" )
                        $( "#submit-button" ).prop( "disabled", false )
                        return false
                    }
                }

                gtag( "event", "purchase" )
                $( "#checkout > .content" ).empty().append(`
                    <h3>Thank you for signing up, and welcome to the club!</h3>
                    <p>An email is on its way to you shortly with more information.</p>
                `)  
            }
        } catch ( error ) {
            gtag( "event", "server-error", { value: error } )
            const displayError = document.getElementById( 'card-errors' );
            displayError.textContent = `Something went wrong. Please try again!`;
            $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" )
            $( "#submit-button" ).prop( "disabled", false )
            console.error( error )
        }
    }
}
