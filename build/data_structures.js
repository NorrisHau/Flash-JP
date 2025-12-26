export const defaultProductData = {
    memoryStats: {},
    dailyPlan: {
        target: 20,
        completed: 0,
        date: new Date().toISOString().split("T")[0],
    },
    studyCalendar: {},
    combo: {
        count: 0,
        lastSuccessAt: 0,
    },
    cardMode: "step",
    cardRevealState: {
        stage: "reading",
    },
};
