import { MongoClient, ObjectId } from 'mongodb';

const SYSTEM_CARE_TYPES = [
    { name: 'Watering', options: ['Deep', 'Shallow'] },
    { name: 'Fertilizing', options: ['Liquid', 'Granular', 'Slow-release'] },
    { name: 'Pruning', options: [] },
    { name: 'Repotting', options: [] },
    { name: 'Misting', options: [] },
    { name: 'Pest treatment', options: ['Neem oil', 'Insecticidal soap', 'Systemic'] },
    { name: 'Wiping leaves', options: [] },
    { name: 'Rotating', options: [] },
    { name: 'Mowing', options: ['Low', 'High'] }
];

async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is required');

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db();
    const collection = db.collection('care-types');

    let inserted = 0;
    for (const careType of SYSTEM_CARE_TYPES) {
        const existing = await collection.findOne({ userId: null, name: careType.name });
        if (!existing) {
            const now = new Date();
            await collection.insertOne({
                _id: new ObjectId(),
                userId: null,
                name: careType.name,
                options: careType.options,
                createdAt: now,
                updatedAt: now
            });
            inserted++;
        }
    }

    console.log(`Seeded ${inserted} system care type(s) (${SYSTEM_CARE_TYPES.length - inserted} already existed).`);
    await client.close();
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
