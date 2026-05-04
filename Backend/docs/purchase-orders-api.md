## Purchase Orders API Specification

**Base URL (backend)**  
`/api/v1/purchase-orders`

> All endpoints are **authenticated** and require a valid JWT (same as other protected APIs in this project).

Common response envelope (success):

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```

Common response envelope (error – from global error handler):

```json
{
  "success": false,
  "message": "Error summary",
  "errorMessages": [
    {
      "path": "field.path.or.context",
      "message": "Detailed explanation"
    }
  ],
  "stack": "stack trace if enabled"
}
```

---

## 1. Upload Purchase Orders from CSV/Excel File

- **Method**: `POST`
- **URL**: `/api/v1/purchase-orders/upload`
- **Auth**: Required (Bearer token)
- **Content-Type**: `multipart/form-data`

### Description

Upload a CSV or Excel file to bulk create purchase orders with their line items. The file should contain all columns from both `purchase_orders` and `purchase_order_lines` tables. Rows with the same `po_number` will be grouped into a single purchase order with multiple lines.

### Request

**Form Data:**
- `file` (file, required): CSV or Excel file (.csv, .xlsx, .xls)
  - Maximum file size: 10MB
  - File must contain headers matching the column names

### File Format

The file should contain all columns from both tables. Each row represents a purchase order line. Rows with the same `po_number` will be grouped together.

**Required Columns:**
- `po_number` (string, required) - Purchase order number
- `status_code` (string, required) - Status code
- `line_number` (number, required) - Line number
- `line_status_code` (string, required) - Line status code

**All Available Columns:**

**Purchase Order Header Columns:**
- `po_number` - Purchase order number (required)
- `status_code` - Status code (required)
- `status_name` - Status name
- `order_status` - Order status: 'pending', 'partially_received', 'full_received' (default: 'pending')
- `procurement_bu_id` - Procurement business unit ID
- `procurement_bu_name` - Procurement business unit name
- `supplier_id` - Supplier ID
- `supplier_name` - Supplier name
- `supplier_site_id` - Supplier site ID
- `supplier_site_code` - Supplier site code
- `buyer_id` - Buyer ID
- `buyer_name` - Buyer name
- `ship_to_location_id` - Ship to location ID
- `ship_to_location_code` - Ship to location code
- `ship_to_address` - Ship to address
- `currency_code` - Currency code
- `ordered_amount` - Ordered amount
- `tax_amount` - Tax amount
- `total_amount` - Total amount
- `order_date` - Order date (ISO format)
- `source_system` - Source system (default: 'oracle_fusion')

**Purchase Order Line Columns:**
- `line_number` - Line number (required)
- `line_status_code` - Line status code (required)
- `line_status_name` - Line status name
- `line_type` - Line type
- `item_id` - Item ID
- `item_code` - Item code
- `item_description` - Item description
- `category_code` - Category code
- `uom_code` - Unit of measure code
- `uom_name` - Unit of measure name
- `quantity` - Quantity
- `unit_price` - Unit price
- `currency_code` - Currency code
- `line_amount` - Line amount
- `line_tax_amount` - Line tax amount (note: use `line_tax_amount` not `tax_amount` for lines)
- `line_total_amount` - Line total amount
- `serial_start` - Serial start
- `serial_end` - Serial end

### Example Request (using curl)

```bash
curl -X POST \
  http://localhost:5000/api/v1/purchase-orders/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@purchase_orders.xlsx"
```

### Success Response (All Successful)

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Successfully created 3 purchase order(s)",
  "data": {
    "total": 3,
    "success": 3,
    "failed": 0,
    "results": [
      {
        "po_number": "PO-1001",
        "success": true,
        "po": {
          "po_header_id": 1234567890,
          "po_number": "PO-1001",
          "status_code": "OPEN",
          "status_name": "Open",
          "order_status": "pending",
          "supplier_id": 100,
          "supplier_name": "ABC Supplier",
          "created_at": "2024-01-15T10:30:00Z"
        },
        "lines": [
          {
            "po_line_id": 1111111111,
            "po_header_id": 1234567890,
            "line_number": 1,
            "line_status_code": "OPEN",
            "item_code": "ITEM-01",
            "quantity": "10",
            "unit_price": "100.00"
          }
        ]
      }
    ]
  }
}
```

### Partial Success Response

**Status Code:** `207 Multi-Status`

```json
{
  "success": false,
  "message": "Created 2 purchase order(s), 1 failed",
  "data": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "results": [
      {
        "po_number": "PO-1001",
        "success": true,
        "po": { ... },
        "lines": [ ... ]
      },
      {
        "po_number": "PO-1002",
        "success": false,
        "error": "Duplicate po_number: PO-1002"
      }
    ]
  }
}
```

### Error Responses

**No File Uploaded (400 Bad Request):**
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

**Invalid File Type (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid file type. Only CSV and Excel files are supported"
}
```

**File Too Large (400 Bad Request):**
```json
{
  "success": false,
  "message": "File too large"
}
```

**Empty File (400 Bad Request):**
```json
{
  "success": false,
  "message": "Excel file is empty or has no data rows"
}
```

**Missing Required Fields (400 Bad Request):**
```json
{
  "success": false,
  "message": "Row missing required field: po_number"
}
```

---

## 2. Create Purchase Order **with** Lines

- **Method**: `POST`
- **URL**: `/api/v1/purchase-orders/with-lines`
- **Auth**: Required (Bearer token)

### Request body

```json
{
  "po": {
    "po_number": "PO-1001",
    "status_code": "OPEN",
    "status_name": "Open",
    "order_status": "pending",
    "procurement_bu_id": 10,
    "procurement_bu_name": "Procurement BU",
    "supplier_id": 1,
    "supplier_name": "ABC Supplier",
    "supplier_site_id": 2,
    "supplier_site_code": "DHK-01",
    "buyer_id": 5,
    "buyer_name": "John Buyer",
    "ship_to_location_id": 100,
    "ship_to_location_code": "WH-01",
    "ship_to_address": "Warehouse Address",
    "currency_code": "BDT",
    "ordered_amount": 1000,
    "tax_amount": 150,
    "total_amount": 1150,
    "order_date": "2025-02-18T00:00:00.000Z",
    "source_system": "oracle_fusion",
    "raw_payload": {}
  },
  "lines": [
    {
      "line_number": 1,
      "line_status_code": "OPEN",
      "line_status_name": "Open",
      "line_type": "Goods",
      "item_id": 101,
      "item_code": "ITEM-001",
      "item_description": "Sample Item 1",
      "category_code": "CAT-01",
      "uom_code": "PCS",
      "uom_name": "Pieces",
      "quantity": 10,
      "unit_price": 100,
      "currency_code": "BDT",
      "line_amount": 1000,
      "tax_amount": 150,
      "total_amount": 1150,
      "serial_start": "S001",
      "serial_end": "S010",
      "raw_payload": {}
    }
  ]
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order with lines created successfully",
  "data": {
    "po": {
      "po_header_id": 1739880000000,
      "po_number": "PO-1001",
      "status_code": "OPEN",
      "status_name": "Open",
      "order_status": "pending",
      "procurement_bu_id": 10,
      "procurement_bu_name": "Procurement BU",
      "supplier_id": 1,
      "supplier_name": "ABC Supplier",
      "supplier_site_id": 2,
      "supplier_site_code": "DHK-01",
      "buyer_id": 5,
      "buyer_name": "John Buyer",
      "ship_to_location_id": 100,
      "ship_to_location_code": "WH-01",
      "ship_to_address": "Warehouse Address",
      "currency_code": "BDT",
      "ordered_amount": "1000.00",
      "tax_amount": "150.00",
      "total_amount": "1150.00",
      "order_date": "2025-02-18T00:00:00.000Z",
      "source_system": "oracle_fusion",
      "raw_payload": {},
      "created_at": "2025-02-18T10:00:00.000Z",
      "updated_at": "2025-02-18T10:00:00.000Z",
      "inserted_at": "2025-02-18T10:00:00.000Z",
      "synced_at": null
    },
    "lines": [
      {
        "po_line_id": 1739880000500,
        "po_header_id": 1739880000000,
        "line_number": 1,
        "line_status_code": "OPEN",
        "line_status_name": "Open",
        "line_type": "Goods",
        "item_id": 101,
        "item_code": "ITEM-001",
        "item_description": "Sample Item 1",
        "category_code": "CAT-01",
        "uom_code": "PCS",
        "uom_name": "Pieces",
        "quantity": "10.0000",
        "unit_price": "100.0000",
        "currency_code": "BDT",
        "line_amount": "1000.00",
        "tax_amount": "150.00",
        "total_amount": "1150.00",
        "serial_start": "S001",
        "serial_end": "S010",
        "raw_payload": {},
        "created_at": "2025-02-18T10:00:00.000Z",
        "updated_at": "2025-02-18T10:00:00.000Z",
        "inserted_at": "2025-02-18T10:00:00.000Z",
        "synced_at": null
      }
    ]
  }
}
```

### Possible errors

- `400 Bad Request` – Validation error (missing `po_number`, `status_code`, line `line_number`, etc.).
- `401 Unauthorized` – Missing/invalid token.
- `409 Conflict` – DB constraint issues (e.g., duplicate `po_number`) will be surfaced via generic error handler.

---

## 2. Create Purchase Order (Header Only)

- **Method**: `POST`
- **URL**: `/api/v1/purchase-orders`
- **Auth**: Required

### Request body

```json
{
  "po_number": "PO-1002",
  "status_code": "OPEN",
  "supplier_id": 2,
  "supplier_name": "XYZ Supplier",
  "order_status": "pending",
  "currency_code": "BDT",
  "ordered_amount": 500,
  "tax_amount": 75,
  "total_amount": 575
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order created successfully",
  "data": {
    "po_header_id": 1739880001000,
    "po_number": "PO-1002",
    "status_code": "OPEN",
    "supplier_id": 2,
    "supplier_name": "XYZ Supplier",
    "order_status": "pending",
    "currency_code": "BDT",
    "ordered_amount": "500.00",
    "tax_amount": "75.00",
    "total_amount": "575.00",
    "created_at": "2025-02-18T10:05:00.000Z",
    "updated_at": "2025-02-18T10:05:00.000Z",
    "inserted_at": "2025-02-18T10:05:00.000Z",
    "synced_at": null
  }
}
```

---

## 3. Create Purchase Order Line (Individually)

- **Method**: `POST`
- **URL**: `/api/v1/purchase-orders/lines`
- **Auth**: Required

### Request body

```json
{
  "po_header_id": 1739880001000,
  "line_number": 1,
  "line_status_code": "OPEN",
  "item_id": 201,
  "item_code": "ITEM-XYZ",
  "item_description": "Sample XYZ Item",
  "quantity": 20,
  "unit_price": 50,
  "currency_code": "BDT",
  "line_amount": 1000
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order line created successfully",
  "data": {
    "po_line_id": 1739880002000,
    "po_header_id": 1739880001000,
    "line_number": 1,
    "line_status_code": "OPEN",
    "item_id": 201,
    "item_code": "ITEM-XYZ",
    "item_description": "Sample XYZ Item",
    "quantity": "20.0000",
    "unit_price": "50.0000",
    "line_amount": "1000.00",
    "created_at": "2025-02-18T10:10:00.000Z",
    "updated_at": "2025-02-18T10:10:00.000Z",
    "inserted_at": "2025-02-18T10:10:00.000Z",
    "synced_at": null
  }
}
```

---

## 4. Update Purchase Order **with** Lines

- **Method**: `PUT`
- **URL**: `/api/v1/purchase-orders/:po_header_id/with-lines`
- **Auth**: Required

### Request body

```json
{
  "po": {
    "status_code": "CLOSED",
    "order_status": "full_received"
  },
  "lines": [
    {
      "_action": "update",
      "po_line_id": 1739880002000,
      "quantity": 25
    },
    {
      "_action": "create",
      "line_number": 2,
      "line_status_code": "OPEN",
      "item_code": "ITEM-NEW",
      "quantity": 5,
      "unit_price": 200
    },
    {
      "_action": "delete",
      "po_line_id": 1739880002500
    }
  ]
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order and lines updated successfully",
  "data": {
    "po": { "...updated PO row..." },
    "lines": [
      "...affected line rows (updated/created/deleted)..."
    ]
  }
}
```

> **Note**: This operation is transactional – either all header+line changes succeed, or all are rolled back.

---

## 5. Update Purchase Order (Header Only)

- **Method**: `PUT`
- **URL**: `/api/v1/purchase-orders/:po_header_id`
- **Auth**: Required

### Request body

```json
{
  "status_code": "CLOSED",
  "order_status": "full_received",
  "buyer_name": "Updated Buyer"
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order updated successfully",
  "data": { "...updated PO row..." }
}
```

---

## 6. Update Purchase Order Line (Individually)

- **Method**: `PUT`
- **URL**: `/api/v1/purchase-orders/lines/:po_line_id`
- **Auth**: Required

### Request body

```json
{
  "quantity": 30,
  "unit_price": 55
}
```

### Successful response

```json
{
  "success": true,
  "message": "Purchase order line updated successfully",
  "data": { "...updated line row..." }
}
```

---

## 7. Get Purchase Order (with Lines)

- **Method**: `GET`
- **URL**: `/api/v1/purchase-orders/:po_header_id`
- **Auth**: Required

### Successful response

```json
{
  "success": true,
  "message": "Purchase order retrieved successfully",
  "data": {
    "po": { "...PO row..." },
    "lines": [
      { "...line row 1..." },
      { "...line row 2..." }
    ]
  }
}
```

---

## 8. Get Purchase Order Line

- **Method**: `GET`
- **URL**: `/api/v1/purchase-orders/lines/:po_line_id`
- **Auth**: Required

### Successful response

```json
{
  "success": true,
  "message": "Purchase order line retrieved successfully",
  "data": { "...line row..." }
}
```

---

## 9. List Purchase Orders

- **Method**: `GET`
- **URL**: `/api/v1/purchase-orders`
- **Auth**: Required

### Query parameters

- `status_code` (optional, `string`)
- `supplier_id` (optional, `number` as string)
- `po_number` (optional, `string`)
- `limit` (optional, `number` as string, default 20, max 100)
- `offset` (optional, `number` as string, default 0)

### Example request

`GET /api/v1/purchase-orders?status_code=OPEN&limit=10&offset=0`

### Successful response

```json
{
  "success": true,
  "message": "Purchase orders retrieved successfully",
  "data": [
    { "...PO row 1..." },
    { "...PO row 2..." }
  ],
  "meta": {
    "total": 25,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 10. Delete Purchase Order (Header + Lines)

- **Method**: `DELETE`
- **URL**: `/api/v1/purchase-orders/:po_header_id`
- **Auth**: Required

> Because of `ON DELETE CASCADE` on `purchase_order_lines.po_header_id`, deleting the header will delete its lines.

### Successful response

```http
204 No Content
```

Body is empty.

---

## 11. Delete Purchase Order Line

- **Method**: `DELETE`
- **URL**: `/api/v1/purchase-orders/lines/:po_line_id`
- **Auth**: Required

### Successful response

```http
204 No Content
```

Body is empty.

