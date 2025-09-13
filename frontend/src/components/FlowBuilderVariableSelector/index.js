import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Paper
} from "@material-ui/core";
import { Search as SearchIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minHeight: 400,
    padding: 0
  },
  searchField: {
    margin: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  variableChip: {
    fontFamily: "monospace",
    fontSize: "0.875rem",
    backgroundColor: theme.palette.primary.main,
    color: "white"
  },
  listItem: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  description: {
    fontSize: "0.875rem",
    marginLeft: theme.spacing(1)
  },
  example: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: theme.palette.text.secondary
  },
  tabPanel: {
    padding: theme.spacing(2),
    paddingTop: 0
  }
}));

const FlowBuilderVariableSelector = ({ open, onClose, onSelectVariable }) => {
  const classes = useStyles();
  const [searchTerm, setSearchTerm] = useState("");
  const [tabValue, setTabValue] = useState(0);

  const webhookVariables = [
    // Dados do Cliente
    { name: "customer_name", description: "Nome completo do cliente", example: "João Silva", category: "customer" },
    { name: "customer_first_name", description: "Primeiro nome do cliente", example: "João", category: "customer" },
    { name: "customer_email", description: "Email do cliente", example: "joao@email.com", category: "customer" },
    { name: "customer_phone", description: "Telefone do cliente", example: "11999999999", category: "customer" },
    { name: "customer_cpf", description: "CPF do cliente", example: "123.456.789-00", category: "customer" },
    
    // Dados do Produto
    { name: "product_name", description: "Nome do produto", example: "Curso Digital XYZ", category: "product" },
    { name: "product_id", description: "ID do produto", example: "PROD123", category: "product" },
    
    // Dados da Transação
    { name: "transaction_id", description: "ID da transação", example: "TRX987654321", category: "transaction" },
    { name: "transaction_amount", description: "Valor da transação", example: "197.00", category: "transaction" },
    { name: "transaction_status", description: "Status do pagamento", example: "approved", category: "transaction" },
    { name: "transaction_date", description: "Data da transação", example: "2024-01-13", category: "transaction" },
    { name: "payment_method", description: "Método de pagamento", example: "credit_card", category: "transaction" },
    
    // Dados do Evento
    { name: "event_type", description: "Tipo do evento", example: "order_approved", category: "event" },
    { name: "webhook_platform", description: "Plataforma de origem", example: "kiwify", category: "event" },
    { name: "webhook_link_name", description: "Nome do webhook", example: "Vendas Kiwify", category: "event" },
    
    // Dados Específicos
    { name: "pix_code", description: "Código PIX", example: "BR1234567890", category: "payment" },
    { name: "pix_expiration", description: "Validade do PIX", example: "2024-01-14 18:00", category: "payment" },
    { name: "boleto_url", description: "URL do boleto", example: "https://...", category: "payment" },
    { name: "boleto_barcode", description: "Código de barras", example: "34191.79001...", category: "payment" },
    { name: "access_url", description: "URL de acesso ao produto", example: "https://...", category: "product" },
    { name: "commission_amount", description: "Valor da comissão", example: "39.40", category: "transaction" }
  ];

  const systemVariables = [
    { name: "firstName", description: "Primeiro nome do contato", example: "Maria", category: "contact" },
    { name: "name", description: "Nome completo do contato", example: "Maria Silva", category: "contact" },
    { name: "ticket_id", description: "ID do ticket", example: "12345", category: "ticket" },
    { name: "userName", description: "Nome do atendente", example: "João Atendente", category: "user" },
    { name: "ms", description: "Saudação baseada no horário", example: "Boa tarde", category: "system" },
    { name: "hour", description: "Horário atual", example: "14:30:00", category: "system" },
    { name: "date", description: "Data atual", example: "13-01-2024", category: "system" },
    { name: "queue", description: "Nome da fila", example: "Suporte", category: "ticket" },
    { name: "connection", description: "Nome da conexão WhatsApp", example: "WhatsApp 1", category: "system" },
    { name: "data_hora", description: "Data e hora formatadas", example: "13-01-2024 às 14:30:00", category: "system" },
    { name: "protocol", description: "Número de protocolo", example: "202401131430001234", category: "ticket" },
    { name: "name_company", description: "Nome da empresa", example: "Empresa XYZ", category: "company" }
  ];

  const getVariablesByTab = () => {
    if (tabValue === 0) return webhookVariables;
    if (tabValue === 1) return systemVariables;
    return [...webhookVariables, ...systemVariables];
  };

  const filteredVariables = getVariablesByTab().filter(variable =>
    variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectVariable = (variableName, isSystem = false) => {
    const prefix = isSystem ? "{{" : "${";
    const suffix = isSystem ? "}}" : "}";
    onSelectVariable(`${prefix}${variableName}${suffix}`);
    onClose();
  };

  const getCategoryColor = (category) => {
    const colors = {
      customer: "#4CAF50",
      product: "#2196F3",
      transaction: "#FF9800",
      event: "#9C27B0",
      payment: "#F44336",
      contact: "#00BCD4",
      ticket: "#795548",
      user: "#607D8B",
      system: "#9E9E9E",
      company: "#3F51B5"
    };
    return colors[category] || "#757575";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Selecionar Variável</Typography>
        <Typography variant="caption" color="textSecondary">
          Clique em uma variável para inseri-la no texto
        </Typography>
      </DialogTitle>
      
      <DialogContent className={classes.dialogContent}>
        <Paper square>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Variáveis do Webhook" />
            <Tab label="Variáveis do Sistema" />
            <Tab label="Todas as Variáveis" />
          </Tabs>
        </Paper>

        <TextField
          fullWidth
          placeholder="Pesquisar variáveis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <List>
          {filteredVariables.map((variable) => {
            const isSystem = systemVariables.some(v => v.name === variable.name);
            return (
              <ListItem
                key={variable.name}
                button
                onClick={() => handleSelectVariable(variable.name, isSystem)}
                className={classes.listItem}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      <Chip
                        label={isSystem ? `{{${variable.name}}}` : `\${${variable.name}}`}
                        size="small"
                        className={classes.variableChip}
                      />
                      <Typography className={classes.description}>
                        {variable.description}
                      </Typography>
                      <Box ml="auto">
                        <Chip
                          label={variable.category}
                          size="small"
                          style={{
                            backgroundColor: getCategoryColor(variable.category),
                            color: "white",
                            fontSize: "0.7rem"
                          }}
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography className={classes.example}>
                      Exemplo: {variable.example}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default FlowBuilderVariableSelector;