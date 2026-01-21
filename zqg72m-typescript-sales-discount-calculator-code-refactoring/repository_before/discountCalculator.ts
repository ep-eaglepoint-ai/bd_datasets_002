type Callback = (err: any, result: any) => void;

function processAllSales(
  transactions: any[],
  customers: any[],
  taxes: any[],
  callback: Callback
): void {
  try {
    let results: any[] = [];
    
    for (let i = 0; i < transactions.length; i++) {
      let t = transactions[i];
      let customerTier = 'bronze';
      
      for (let j = 0; j < customers.length; j++) {
        if (customers[j].customer_id == t.customer_id) {
          customerTier = customers[j].tier;
        }
      }
      
      let discountRate: any;
      if (customerTier == 'platinum') {
        discountRate = 0.20;
      } else if (customerTier == 'gold') {
        discountRate = 0.15;
      } else if (customerTier == 'silver') {
        discountRate = 0.10;
      } else {
        discountRate = 0.05;
      }
      
      if (t.quantity >= 10) {
        discountRate = discountRate + 0.05;
      }
      
      let basePrice = t.product_price * t.quantity;
      let discountAmount = basePrice * discountRate;
      let subtotal = basePrice - discountAmount;
      
      let taxRate: any = 0;
      for (let k = 0; k < taxes.length; k++) {
        if (taxes[k].state == t.state) {
          taxRate = taxes[k].tax_rate;
        }
      }
      
      let taxAmount = subtotal * taxRate;
      let finalPrice = subtotal + taxAmount;
      
      discountAmount = Math.round(discountAmount * 100) / 100;
      subtotal = Math.round(subtotal * 100) / 100;
      taxAmount = Math.round(taxAmount * 100) / 100;
      finalPrice = Math.round(finalPrice * 100) / 100;
      
      let result: any = {
        order_id: t.order_id,
        customer_id: t.customer_id,
        product_price: t.product_price,
        quantity: t.quantity,
        state: t.state,
        discount_rate: discountRate,
        discount_amount: discountAmount,
        subtotal: subtotal,
        tax_amount: taxAmount,
        final_price: finalPrice
      };
      
      results.push(result);
    }
    
    callback(null, results);
  } catch (e) {
    callback(e, null);
  }
}

export { processAllSales };

