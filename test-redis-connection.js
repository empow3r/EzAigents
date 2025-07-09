const Redis = require('ioredis');

async function testRedis() {
    const redis = new Redis({
        host: 'localhost',
        port: 6379,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    try {
        await redis.ping();
        console.log('✅ Redis connection successful');
        
        // Test basic operations
        await redis.set('test:key', 'test-value');
        const value = await redis.get('test:key');
        console.log('✅ Redis operations working:', value);
        
        await redis.del('test:key');
        redis.disconnect();
        return true;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        redis.disconnect();
        return false;
    }
}

testRedis();
