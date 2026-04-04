"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNextReview = calculateNextReview;
/**
 * SuperMemo-2 (SM-2) algorithm implementation.
 *
 * @param quality 0-5 scale.
 *  0 = Complete blackout,
 *  1 = Incorrect response, but remembered the correct one,
 *  2 = Incorrect response, but seems easy to recall,
 *  3 = Correct response recalled with serious difficulty,
 *  4 = Correct response after a hesitation,
 *  5 = Perfect response.
 * @param repetitions Number of times the item has been reviewed (0 initially)
 * @param easiness Easiness factor (default 2.5)
 * @param interval Current interval in days (default 0)
 * @returns SM2Result
 */
function calculateNextReview(quality, repetitions = 0, easiness = 2.5, interval = 0) {
    // Quality is typically bounded 0-5
    quality = Math.max(0, Math.min(5, quality));
    let nextInterval;
    let nextRepetitions;
    let nextEasiness;
    // Correct responses
    if (quality >= 3) {
        if (repetitions === 0) {
            nextInterval = 1;
        }
        else if (repetitions === 1) {
            nextInterval = 6;
        }
        else {
            nextInterval = Math.round(interval * easiness);
        }
        nextRepetitions = repetitions + 1;
    }
    else {
        // Incorrect responses reset interval
        nextRepetitions = 0;
        nextInterval = 1;
    }
    // Calculate new easiness factor
    nextEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (nextEasiness < 1.3) {
        nextEasiness = 1.3;
    }
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    return {
        interval: nextInterval,
        repetitions: nextRepetitions,
        easiness: nextEasiness,
        nextReviewDate,
    };
}
