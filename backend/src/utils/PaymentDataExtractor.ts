interface StandardizedPaymentData {
  // Dados básicos do cliente
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf?: string;
  customer_first_name?: string;
  
  // Dados do produto
  product_name: string;
  product_id: string;
  
  // Dados da transação
  transaction_id: string;
  transaction_amount: string;
  transaction_status: string;
  transaction_date: string;
  payment_method: string;
  
  // Dados adicionais
  event_type: string;
  currency: string;
  platform: string;
  access_url?: string;
  
  // Dados específicos PIX
  pix_code?: string;
  pix_expiration?: string;
  
  // Dados específicos Boleto
  boleto_url?: string;
  boleto_barcode?: string;
  boleto_expiry_date?: string;
  
  // Dados de comissão
  commission_amount?: string;
  
  // Payload original para debug
  payload_original?: string;
}

export const extractVariables = (platform: string, payload: any): StandardizedPaymentData => {
  switch (platform.toLowerCase()) {
    case 'kiwify':
      return extractKiwifyVariables(payload);
    case 'hotmart':
      return extractHotmartVariables(payload);
    case 'braip':
      return extractBraipVariables(payload);
    case 'monetizze':
      return extractMonetizzeVariables(payload);
    case 'cacto':
      return extractCactoVariables(payload);
    case 'perfectpay':
    case 'perfect_pay':
      return extractPerfectPayVariables(payload);
    case 'eduzz':
      return extractEduzzVariables(payload);
    default:
      return extractGenericVariables(payload);
  }
};

export const determineEventType = (platform: string, payload: any): string => {
  switch (platform.toLowerCase()) {
    case 'kiwify':
      return payload.webhook_event_type || 'unknown';
    case 'hotmart':
      return payload.event || payload.action || 'unknown';
    case 'braip':
      return payload.type_postback || 'unknown';
    case 'monetizze':
      return payload.tipoEvento || 'unknown';
    case 'cacto':
      return payload.event || 'unknown';
    case 'perfectpay':
    case 'perfect_pay':
      return payload.sale_status_enum || 'unknown';
    case 'eduzz':
      return payload.trans_status || 'unknown';
    default:
      return payload.event || payload.type || payload.action || 'unknown';
  }
};

// KIWIFY
const extractKiwifyVariables = (payload: any): StandardizedPaymentData => {
  return {
    // Dados do cliente
    customer_name: payload.Customer?.full_name || payload.Customer?.first_name || '',
    customer_email: payload.Customer?.email || '',
    customer_phone: payload.Customer?.mobile || '',
    customer_cpf: payload.Customer?.CPF || '',
    customer_first_name: payload.Customer?.first_name || '',
    
    // Produto
    product_name: payload.Product?.product_name || '',
    product_id: payload.Product?.product_id || '',
    
    // Transação
    transaction_id: payload.order_id || '',
    transaction_amount: String(payload.Commissions?.charge_amount || ''),
    transaction_status: payload.order_status || '',
    transaction_date: payload.created_at || new Date().toISOString(),
    payment_method: payload.payment_method || '',
    
    // Específicos Kiwify
    event_type: payload.webhook_event_type || '',
    currency: payload.Commissions?.currency || 'BRL',
    platform: 'kiwify',
    access_url: payload.access_url || '',
    
    // PIX
    pix_code: payload.pix_code || '',
    pix_expiration: payload.pix_expiration || '',
    
    // Boleto
    boleto_url: payload.boleto_URL || '',
    boleto_barcode: payload.boleto_barcode || '',
    
    // Comissão
    commission_amount: String(payload.Commissions?.my_commission || ''),
    
    // Debug
    payload_original: JSON.stringify(payload)
  };
};

// HOTMART
const extractHotmartVariables = (payload: any): StandardizedPaymentData => {
  // Construir telefone da Hotmart corretamente
  const buyer = payload.data?.buyer || payload.buyer || {};
  let phone = '';

  if (buyer.checkout_phone_code && buyer.checkout_phone) {
    // Combinar código de área + número
    const phoneCode = buyer.checkout_phone_code.replace(/\D/g, '');
    const phoneNumber = buyer.checkout_phone.replace(/\D/g, '');
    phone = phoneCode + phoneNumber;
  } else if (buyer.phone) {
    phone = buyer.phone;
  }

  return {
    customer_name: buyer.name || '',
    customer_email: buyer.email || '',
    customer_phone: phone,
    customer_cpf: buyer.document || '',
    customer_first_name: (buyer.name || '').split(' ')[0],
    
    product_name: payload.data?.product?.name || payload.product?.name || '',
    product_id: String(payload.data?.product?.id || payload.product?.id || ''),
    
    transaction_id: payload.data?.purchase?.transaction || payload.transaction?.id || '',
    transaction_amount: String(payload.data?.purchase?.price?.value || payload.price?.value || ''),
    transaction_status: payload.data?.purchase?.status || payload.status || '',
    transaction_date: payload.data?.purchase?.approved_date || payload.purchase_date || new Date().toISOString(),
    payment_method: payload.data?.purchase?.payment?.method || payload.payment?.type || '',
    
    event_type: payload.event || payload.action || '',
    currency: payload.data?.purchase?.price?.currency_value || 'BRL',
    platform: 'hotmart',
    access_url: payload.data?.product?.access_url || '',
    
    commission_amount: String(payload.data?.commissions?.value || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// BRAIP
const extractBraipVariables = (payload: any): StandardizedPaymentData => {
  return {
    customer_name: payload.client_name || '',
    customer_email: payload.client_email || '',
    customer_phone: payload.client_cel || payload.client_phone || '',
    customer_cpf: payload.client_document || '',
    customer_first_name: (payload.client_name || '').split(' ')[0],
    
    product_name: payload.product_name || '',
    product_id: String(payload.product_id || ''),
    
    transaction_id: payload.trans_cod || payload.transaction_id || '',
    transaction_amount: String(payload.trans_value || payload.price || ''),
    transaction_status: payload.trans_status || '',
    transaction_date: payload.trans_createdate || new Date().toISOString(),
    payment_method: payload.trans_payment || '',
    
    event_type: payload.type_postback || '',
    currency: payload.currency_code || 'BRL',
    platform: 'braip',
    access_url: payload.product_support_email || '', // Braip não envia URL de acesso diretamente
    
    commission_amount: String(payload.commission_value || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// MONETIZZE
const extractMonetizzeVariables = (payload: any): StandardizedPaymentData => {
  const venda = payload.venda || {};
  const produto = payload.produto || {};
  const comprador = payload.comprador || {};
  
  return {
    customer_name: comprador.nome || '',
    customer_email: comprador.email || '',
    customer_phone: comprador.telefone || comprador.cnpj_cpf || '',
    customer_cpf: comprador.cnpj_cpf || '',
    customer_first_name: (comprador.nome || '').split(' ')[0],
    
    product_name: produto.nome || '',
    product_id: String(produto.codigo || ''),
    
    transaction_id: venda.codigo || '',
    transaction_amount: String(venda.valor || ''),
    transaction_status: venda.status || '',
    transaction_date: venda.dataInicio || new Date().toISOString(),
    payment_method: venda.formaPagamento || '',
    
    event_type: payload.tipoEvento || '',
    currency: 'BRL',
    platform: 'monetizze',
    access_url: '', // Monetizze não envia URL de acesso diretamente
    
    commission_amount: String(venda.comissao || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// CACTO (CACTOPAY)
const extractCactoVariables = (payload: any): StandardizedPaymentData => {
  return {
    customer_name: payload.customer?.name || '',
    customer_email: payload.customer?.email || '',
    customer_phone: payload.customer?.phone || '',
    customer_cpf: payload.customer?.cpf || '',
    customer_first_name: (payload.customer?.name || '').split(' ')[0],
    
    product_name: payload.product?.name || '',
    product_id: String(payload.product?.id || ''),
    
    transaction_id: payload.transaction?.id || '',
    transaction_amount: String(payload.transaction?.amount || ''),
    transaction_status: payload.transaction?.status || '',
    transaction_date: payload.transaction?.created_at || new Date().toISOString(),
    payment_method: payload.transaction?.payment_method || '',
    
    event_type: payload.event || '',
    currency: payload.transaction?.currency || 'BRL',
    platform: 'cacto',
    access_url: payload.product?.access_url || '',
    
    pix_code: payload.transaction?.pix_code || '',
    pix_expiration: payload.transaction?.pix_expiration || '',
    
    boleto_url: payload.transaction?.boleto_url || '',
    boleto_barcode: payload.transaction?.boleto_barcode || '',
    
    commission_amount: String(payload.transaction?.commission || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// PERFECT PAY
const extractPerfectPayVariables = (payload: any): StandardizedPaymentData => {
  return {
    customer_name: payload.customer_name || '',
    customer_email: payload.customer_email || '',
    customer_phone: payload.customer_phone || '',
    customer_cpf: payload.customer_doc || '',
    customer_first_name: (payload.customer_name || '').split(' ')[0],
    
    product_name: payload.product_name || '',
    product_id: String(payload.product_id || ''),
    
    transaction_id: payload.sale_code || payload.transaction_id || '',
    transaction_amount: String(payload.sale_amount || payload.amount || ''),
    transaction_status: payload.sale_status || '',
    transaction_date: payload.sale_date || new Date().toISOString(),
    payment_method: payload.payment_type || '',
    
    event_type: payload.sale_status_enum || payload.event || '',
    currency: 'BRL',
    platform: 'perfectpay',
    access_url: payload.access_url || '',
    
    commission_amount: String(payload.commission_amount || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// EDUZZ
const extractEduzzVariables = (payload: any): StandardizedPaymentData => {
  return {
    customer_name: payload.cus_name || '',
    customer_email: payload.cus_email || '',
    customer_phone: payload.cus_tel || '',
    customer_cpf: payload.cus_taxnumber || '',
    customer_first_name: (payload.cus_name || '').split(' ')[0],
    
    product_name: payload.product_name || '',
    product_id: String(payload.product_cod || ''),
    
    transaction_id: payload.trans_cod || '',
    transaction_amount: String(payload.trans_value || ''),
    transaction_status: payload.trans_status || '',
    transaction_date: payload.trans_createdate || new Date().toISOString(),
    payment_method: payload.trans_payment || '',
    
    event_type: payload.trans_status || '',
    currency: payload.trans_currency || 'BRL',
    platform: 'eduzz',
    access_url: payload.product_support_email || '', // Eduzz não envia URL de acesso diretamente
    
    commission_amount: String(payload.aff_value || ''),
    
    payload_original: JSON.stringify(payload)
  };
};

// GENÉRICO
const extractGenericVariables = (payload: any): StandardizedPaymentData => {
  return {
    // Tentativa de extrair dados comuns
    customer_name: payload.customer?.name || payload.buyer?.name || payload.client?.name || '',
    customer_email: payload.customer?.email || payload.buyer?.email || payload.client?.email || '',
    customer_phone: payload.customer?.phone || payload.buyer?.phone || payload.client?.phone || '',
    customer_cpf: payload.customer?.document || payload.buyer?.document || '',
    customer_first_name: '',
    
    product_name: payload.product?.name || payload.item?.name || '',
    product_id: String(payload.product?.id || payload.item?.id || ''),
    
    transaction_id: payload.transaction_id || payload.order_id || payload.id || '',
    transaction_amount: String(payload.amount || payload.value || payload.price || ''),
    transaction_status: payload.status || '',
    transaction_date: payload.date || payload.created_at || new Date().toISOString(),
    payment_method: payload.payment_method || payload.payment_type || '',
    
    event_type: payload.event || payload.type || 'generic',
    currency: payload.currency || 'BRL',
    platform: 'generic',
    access_url: payload.access_url || '',
    
    payload_original: JSON.stringify(payload)
  };
};

export { StandardizedPaymentData };