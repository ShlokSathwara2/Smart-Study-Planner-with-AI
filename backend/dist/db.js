"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
        return true;
    }
    catch (err) {
        console.warn('⚠️  MongoDB connection failed:', err);
        console.warn('⚠️  Will retry in background. API may have limited functionality.');
        // Don't exit - allow server to start anyway
        // Retry connection every 10 seconds in background
        setTimeout(() => (0, exports.connectDB)().catch(() => { }), 10000);
        return false;
    }
};
exports.connectDB = connectDB;
