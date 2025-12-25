-- Check InvoiceStatus enum values
SELECT unnest(enum_range(NULL::"InvoiceStatus")) AS status ORDER BY status;

