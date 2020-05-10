
const _ = require( 'lodash' )
const stripe = require('stripe')( process.env.STRIPE_KEY );

const express = require( 'express' );
const cors = require( 'cors' )
const bodyParser = require('body-parser')

const app = express();

const whitelist = [ /localhost/, /adultletics\.com.au/ ];
const corsOptionsDelegate = ( req, callback ) => {
	let corsOptions;
	whitelist.forEach( e => {
		if ( req.header( "Origin" ).match( e ) !== -1 ) {
			corsOptions = { origin: true };
		} else {
			corsOptions = { origin: false };
		}
	});
	callback( null, corsOptions );
};
app.use( cors( corsOptionsDelegate ))

// app.use( cors({ origin: /adultletics\.com.au/ }))
app.use(bodyParser.json())

app.post( '/', async ( req, res ) => {
    const body = _.get( req, "body" )

    const email = _.get( body, "billing_details.email" );
    const name = _.get( body, "billing_details.name" );
    const payment_method = _.get( body, "payment_method" );

    try {
        if ( !email || !name || !payment_method ) throw "input data missing"

        const customer = await stripe.customers.create({
            payment_method: payment_method,
            email, name,
            invoice_settings: { default_payment_method: payment_method },
        });
            
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ plan: "plan_HFIrXRlfzd2L3T" }],
            trial_from_plan: true,
        });

        return res.status( 200 ).send( subscription )

    } catch ( error ) {
        return res.status( 500 ).send({ error })
    }
});

const port = process.env.PORT || 8080;
app.listen( port, () => {
    console.log('Listening on port', port);
});
