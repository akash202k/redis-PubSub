import { client } from './redisClient';

const publisher = client.duplicate();

const publishMessage = async (channel: string, message: string): Promise<void> => {
    try {
        if (!publisher.isOpen) {
            await publisher.connect();
        }
        console.log("Publisher connected to Redis");

        await publisher.publish(channel, message);
        console.log("Message published:", message);
    } catch (error) {
        console.error("Something went wrong while publishing to Redis", error);
    } finally {
        await publisher.disconnect();
    }
};

export { publishMessage };
