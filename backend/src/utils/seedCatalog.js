/**
 * Seed sample Services and Products (car care + PPF) modelled on 3M Car Care.
 * Idempotent: skips items that already exist (by name).
 * Run: node src/utils/seedCatalog.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Service from '../models/Service.js';
import Product from '../models/Product.js';

const SERVICES = [
  { serviceName: '3M Paint Protection Film (PPF) - Full Body', category: 'PPF', description: 'Full-body 3M PPF installation. Protects against scratches, stone chips and UV.', basePrice: 180000, gstPercentage: 18, estimatedDuration: '2-3 days' },
  { serviceName: '3M PPF - Front Section (Bonnet/Bumper/Fenders)', category: 'PPF', description: 'Front-end paint protection film for high-impact areas.', basePrice: 45000, gstPercentage: 18, estimatedDuration: '1 day' },
  { serviceName: '3M Ceramic Coating', category: 'Coating', description: '9H ceramic coating for gloss and paint durability.', basePrice: 25000, gstPercentage: 18, estimatedDuration: '1-2 days' },
  { serviceName: '3M Graphene Coating', category: 'Coating', description: 'Advanced graphene protective coating.', basePrice: 32000, gstPercentage: 18, estimatedDuration: '1-2 days' },
  { serviceName: '3M Sun Control Film', category: 'Films', description: 'Heat and UV reduction window film for interiors.', basePrice: 18000, gstPercentage: 18, estimatedDuration: '4-6 hours' },
  { serviceName: 'Interior GermKleen Treatment', category: 'Detailing', description: 'Bacteria and odour elimination interior treatment.', basePrice: 4500, gstPercentage: 18, estimatedDuration: '2-3 hours' },
  { serviceName: 'Anti-Corrosion (Underbody) Treatment', category: 'Protection', description: 'Rust prevention coating for underbody.', basePrice: 6000, gstPercentage: 18, estimatedDuration: '3-4 hours' },
  { serviceName: 'Car Wrap & Custom Styling', category: 'Styling', description: 'Custom colour wrap and graphics.', basePrice: 90000, gstPercentage: 18, estimatedDuration: '2-3 days' },
  { serviceName: 'Full Body Wash & Detailing', category: 'Detailing', description: 'Exterior wash, interior vacuum and detailing.', basePrice: 1500, gstPercentage: 18, estimatedDuration: '2 hours' },
  { serviceName: 'Foam Wash', category: 'Wash', description: 'Snow-foam exterior wash.', basePrice: 700, gstPercentage: 18, estimatedDuration: '1 hour' },
];

const PRODUCTS = [
  // PPF films (inventory, tracked in sqft) — isPPF: true
  { productName: '3M PPF Gloss Film Roll', sku: 'PPF-3M-GLOSS', category: 'PPF Film', brand: '3M', unitType: 'sqft', purchasePrice: 280, sellingPrice: 450, gstPercentage: 18, currentStock: 600, openingStock: 600, minimumStock: 100, isPPF: true, supplierName: '3M India' },
  { productName: '3M PPF Matte Film Roll', sku: 'PPF-3M-MATTE', category: 'PPF Film', brand: '3M', unitType: 'sqft', purchasePrice: 320, sellingPrice: 520, gstPercentage: 18, currentStock: 400, openingStock: 400, minimumStock: 100, isPPF: true, supplierName: '3M India' },
  { productName: '3M PPF Coloured Film Roll', sku: 'PPF-3M-COLOR', category: 'PPF Film', brand: '3M', unitType: 'sqft', purchasePrice: 360, sellingPrice: 600, gstPercentage: 18, currentStock: 200, openingStock: 200, minimumStock: 80, isPPF: true, supplierName: '3M India' },

  // Consumables / coatings
  { productName: '3M Ceramic Coating Kit', sku: 'COAT-CER-KIT', category: 'Coating', brand: '3M', unitType: 'bottle', purchasePrice: 6000, sellingPrice: 9000, gstPercentage: 18, currentStock: 40, openingStock: 40, minimumStock: 10, supplierName: '3M India' },
  { productName: '3M Graphene Coating Kit', sku: 'COAT-GRA-KIT', category: 'Coating', brand: '3M', unitType: 'bottle', purchasePrice: 8000, sellingPrice: 12000, gstPercentage: 18, currentStock: 25, openingStock: 25, minimumStock: 8, supplierName: '3M India' },
  { productName: '3M Sun Control Film Roll', sku: 'FILM-SUN', category: 'Films', brand: '3M', unitType: 'roll', purchasePrice: 9000, sellingPrice: 14000, gstPercentage: 18, currentStock: 30, openingStock: 30, minimumStock: 6, supplierName: '3M India' },
  { productName: 'Snow Foam Shampoo (5L)', sku: 'WASH-FOAM-5L', category: 'Wash', brand: '3M', unitType: 'litre', purchasePrice: 1200, sellingPrice: 1800, gstPercentage: 18, currentStock: 80, openingStock: 80, minimumStock: 15, supplierName: '3M India' },
  { productName: 'Microfiber Cloth (Pack of 10)', sku: 'ACC-MF-10', category: 'Accessories', brand: 'Generic', unitType: 'packet', purchasePrice: 350, sellingPrice: 600, gstPercentage: 18, currentStock: 100, openingStock: 100, minimumStock: 20, supplierName: 'Local' },
  { productName: 'Interior GermKleen Solution', sku: 'INT-GERM', category: 'Detailing', brand: '3M', unitType: 'bottle', purchasePrice: 800, sellingPrice: 1400, gstPercentage: 18, currentStock: 50, openingStock: 50, minimumStock: 10, supplierName: '3M India' },
  { productName: 'Anti-Corrosion Spray', sku: 'PROT-ANTICOR', category: 'Protection', brand: '3M', unitType: 'bottle', purchasePrice: 1500, sellingPrice: 2400, gstPercentage: 18, currentStock: 35, openingStock: 35, minimumStock: 8, supplierName: '3M India' },
];

const run = async () => {
  await connectDB();

  let svcAdded = 0;
  for (const s of SERVICES) {
    const exists = await Service.findOne({ serviceName: s.serviceName });
    if (!exists) { await Service.create({ ...s, status: 'active' }); svcAdded++; }
  }

  let prodAdded = 0;
  for (const p of PRODUCTS) {
    const exists = await Product.findOne({ $or: [{ sku: p.sku }, { productName: p.productName }] });
    if (!exists) { await Product.create({ ...p, status: 'active' }); prodAdded++; }
  }

  console.log(`[seedCatalog] Services added: ${svcAdded}/${SERVICES.length}`);
  console.log(`[seedCatalog] Products added: ${prodAdded}/${PRODUCTS.length}`);
  console.log('[seedCatalog] Done. PPF films are flagged isPPF and tracked in sqft.');

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[seedCatalog] Failed:', err.message);
  process.exit(1);
});
