function formatCurrency(value) {
  return `R$ ${Number(value ?? 0).toFixed(2).replace(".", ",")}`;
}

function formatOrderDateTime(dateInput) {
  return new Date(dateInput).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function deliveryLineFor(address) {
  return [
    [address?.rua, address?.numero].filter(Boolean).join(", "),
    [address?.bairro, address?.cidade, address?.uf].filter(Boolean).join(" — "),
  ].filter(Boolean).join(" · ");
}

module.exports = { formatCurrency, formatOrderDateTime, deliveryLineFor };
