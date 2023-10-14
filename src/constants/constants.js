// Alterdot network constants
export const DUST_AMOUNT_IN_ADOT = 0.0000572;
// Slightly different numbers for utxo inputs, this is basically what it costs to add an input to
// an tx, smaller dust amounts are not economical (would could more tx fee to send than to include)
export const DUST_AMOUNT_INPUTS_IN_ADOT = 0.0000148;
export const ADOT_PER_DUFF = 0.00000001;

// Application-specific contants
export const TX_PAGE_SIZE = 30;