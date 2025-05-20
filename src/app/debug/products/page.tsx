import { db } from "@/lib/db";

export default async function DebugProductsPage() {
  const products = await db.product.findMany({
    include: {
      reviews: true,
      addons: true,
    },
  });
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Products in Database ({products.length})</h1>
      
      {products.length === 0 ? (
        <div className="bg-yellow-100 p-4 rounded-md">
          <p className="text-yellow-800">No products found in the database.</p>
          <p className="mt-2">
            Try seeding products using one of these methods:
          </p>
          <ul className="list-disc pl-5 mt-2">
            <li>Visit <code className="bg-gray-200 px-1">/api/seed/single-product</code> to create a single product</li>
            <li>Visit <code className="bg-gray-200 px-1">/api/seed</code> to create multiple products</li>
            <li>Run <code className="bg-gray-200 px-1">node seed-product.js</code> from the terminal</li>
          </ul>
        </div>
      ) : (
        <div className="grid gap-6">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded-md">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 mt-4 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Product Details</h3>
                  <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
                    {JSON.stringify({
                      id: product.id,
                      name: product.name,
                      description: product.description,
                      category: product.category,
                      basePrice: product.basePrice,
                      images: product.images,
                      temperatures: product.temperatures,
                      sizes: product.sizes,
                      inStock: product.inStock
                    }, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Add-ons ({product.addons.length})</h3>
                  {product.addons.length > 0 ? (
                    <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
                      {JSON.stringify(product.addons, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-gray-500">No add-ons found</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 