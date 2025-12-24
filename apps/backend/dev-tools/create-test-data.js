const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Create or get a store
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: { name: 'Test Store' }
      });
      console.log('Created store:', store.id);
    } else {
      console.log('Using existing store:', store.id);
    }

    // Create or get a user
    let user = await prisma.user.findFirst({
      where: { storeId: store.id }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          storeId: store.id
        }
      });
      console.log('Created user:', user.id);
    } else {
      console.log('Using existing user:', user.id);
    }

    // Create a customer
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        storeId: store.id,
        isGuest: false
      }
    });
    console.log('Created customer:', customer.id);

    // Create some products
    const product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        price: 100.00,
        stock: 100,
        storeId: store.id
      }
    });

    const product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        price: 50.00,
        stock: 100,
        storeId: store.id
      }
    });

    console.log('Created products');

    // Create some invoices
    // Unpaid invoice
    const unpaidInvoice = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'UNPAID',
        totalAmount: 250.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 2,
              unitPrice: 100.00
            },
            {
              productId: product2.id,
              quantity: 1,
              unitPrice: 50.00
            }
          ]
        }
      }
    });
    console.log('Created unpaid invoice:', unpaidInvoice.id);

    // Paid invoice
    const paidInvoice = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'PAID',
        totalAmount: 150.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 100.00
            },
            {
              productId: product2.id,
              quantity: 1,
              unitPrice: 50.00
            }
          ]
        }
      }
    });
    console.log('Created paid invoice:', paidInvoice.id);

    // Another unpaid invoice
    const unpaidInvoice2 = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'UNPAID',
        totalAmount: 100.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 100.00
            }
          ]
        }
      }
    });
    console.log('Created another unpaid invoice:', unpaidInvoice2.id);

    console.log('\nTest data created successfully!');
    console.log('Customer ID:', customer.id);
    console.log('\nYou can now test the endpoint:');
    console.log(`GET http://localhost:3000/customers/${customer.id}/statement`);

    return customer.id;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((customerId) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

