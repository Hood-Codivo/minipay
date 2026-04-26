// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MiniPayCheckoutRegistry {
    enum InvoiceStatus {
        Open,
        Paid,
        Cancelled
    }

    struct Invoice {
        address merchant;
        address token;
        uint256 amount;
        uint64 expiresAt;
        bytes32 referenceHash;
        bytes32 metadataHash;
        InvoiceStatus status;
        bytes32 paymentTxHash;
        uint64 createdAt;
    }

    uint256 public nextInvoiceId = 1;

    mapping(uint256 => Invoice) public invoices;

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        address indexed token,
        uint256 amount,
        uint64 expiresAt,
        bytes32 referenceHash,
        bytes32 metadataHash
    );
    event InvoicePaid(
        uint256 indexed invoiceId,
        bytes32 indexed paymentTxHash,
        address indexed recorder
    );
    event InvoiceCancelled(uint256 indexed invoiceId, address indexed merchant);

    function createInvoice(
        address token,
        uint256 amount,
        uint64 expiresAt,
        bytes32 referenceHash,
        bytes32 metadataHash
    ) external returns (uint256 invoiceId) {
        require(token != address(0), "TOKEN_REQUIRED");
        require(amount > 0, "AMOUNT_REQUIRED");
        require(expiresAt == 0 || expiresAt > block.timestamp, "EXPIRY_IN_PAST");

        invoiceId = nextInvoiceId++;
        invoices[invoiceId] = Invoice({
            merchant: msg.sender,
            token: token,
            amount: amount,
            expiresAt: expiresAt,
            referenceHash: referenceHash,
            metadataHash: metadataHash,
            status: InvoiceStatus.Open,
            paymentTxHash: bytes32(0),
            createdAt: uint64(block.timestamp)
        });

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            token,
            amount,
            expiresAt,
            referenceHash,
            metadataHash
        );
    }

    function markInvoicePaid(
        uint256 invoiceId,
        bytes32 paymentTxHash
    ) external {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.merchant != address(0), "INVOICE_NOT_FOUND");
        require(invoice.status == InvoiceStatus.Open, "INVOICE_NOT_OPEN");
        require(paymentTxHash != bytes32(0), "PAYMENT_HASH_REQUIRED");
        require(
            invoice.expiresAt == 0 || invoice.expiresAt >= block.timestamp,
            "INVOICE_EXPIRED"
        );

        invoice.status = InvoiceStatus.Paid;
        invoice.paymentTxHash = paymentTxHash;

        emit InvoicePaid(invoiceId, paymentTxHash, msg.sender);
    }

    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.merchant != address(0), "INVOICE_NOT_FOUND");
        require(invoice.status == InvoiceStatus.Open, "INVOICE_NOT_OPEN");
        require(invoice.merchant == msg.sender, "ONLY_MERCHANT");

        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId, msg.sender);
    }
}
