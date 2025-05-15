const { createMachine, assign, interpret } = XState; 
const { fromEvent, merge } = rxjs; 
const { map, tap } = rxjs.operators;

const slipperVendingMachineDefinition = {
    context: {
        change: 0,
        selectedItem: null,
        insertedMoney: 0,
    },
    id: "slipperVendingMachine",
    initial: "idle",
    states: {
        idle: {
            entry: {
                type: "resetContext", 
            },
            on: {
                START: "selecting",
            },
        },
        selecting: {
            on: {
                SELECT_ITEM: {
                    actions: "assignSelectedItem", 
                },
                INSERT_MONEY: {
                    actions: "assignInsertedMoney", 
                },
                PURCHASE: {
                    target: "dispensing",
                    cond: "canPurchase", 
                },
                CANCEL: {
                    target: "returning",
                    actions: "calculateChangeOnCancel", 
                },
            },
        },
        dispensing: {
            entry: "displayDispensingMessage",
            after: {
                2000: { 
                    target: "returning",
                    actions: "calculateChangeOnPurchase", 
                },
            },
        },
        returning: {
            entry: "displayReturningChangeMessage",
            after: {
                2000: "idle", 
            },
        },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
};

const machineOptions = {
    actions: {
        resetContext: assign({
            insertedMoney: 0,
            selectedItem: null,
            change: 0,
        }),
        assignSelectedItem: assign({
            selectedItem: (_, event) => ({
                id: event.id,
                name: event.name,
                price: event.price,
            }),
        }),
        assignInsertedMoney: assign({
            insertedMoney: (context, event) =>
                context.insertedMoney + event.amount,
        }),
        calculateChangeOnCancel: assign({
            change: (context) => context.insertedMoney,
        }),
        calculateChangeOnPurchase: assign({
            change: (context) =>
                Math.max(0, context.insertedMoney - (context.selectedItem?.price || 0)),
        }),
        displayDispensingMessage: (context, event) => {
            console.log("Action: displayDispensingMessage");
            document.getElementById('messageDisplay').textContent = `Dispensing ${context.selectedItem?.name || 'item'}... Please wait.`;
        },
        displayReturningChangeMessage: (context, event) => {
            console.log("Action: displayReturningChangeMessage");
            if (context.change > 0) {
                document.getElementById('messageDisplay').textContent = `Returning change: Rp${context.change}. Thank you!`;
            } else {
                document.getElementById('messageDisplay').textContent = `Transaction complete. Thank you!`;
            }
        }
    },
    guards: {
        canPurchase: (context) =>
            context.selectedItem &&
            context.insertedMoney >= context.selectedItem.price,
    },
};

const slipperVendingMachine = createMachine(slipperVendingMachineDefinition, machineOptions);

const startButton = document.getElementById('startButton');
const purchaseButton = document.getElementById('purchaseButton');
const cancelButton = document.getElementById('cancelButton');
const selectSlipperAButton = document.getElementById('selectSlipperA');
const selectSlipperBButton = document.getElementById('selectSlipperB');
const insert10kButton = document.getElementById('insert10k');
const insert20kButton = document.getElementById('insert20k');
const insert50kButton = document.getElementById('insert50k');

const currentStateDisplay = document.getElementById('currentState');
const selectedItemDisplay = document.getElementById('selectedItemDisplay');
const itemPriceDisplay = document.getElementById('itemPriceDisplay');
const insertedMoneyDisplay = document.getElementById('insertedMoneyDisplay');
const changeDisplay = document.getElementById('changeDisplay');
const messageDisplay = document.getElementById('messageDisplay');

const vendingService = interpret(slipperVendingMachine).start();

const start$ = fromEvent(startButton, 'click').pipe(map(() => ({ type: 'START' })));
const purchase$ = fromEvent(purchaseButton, 'click').pipe(map(() => ({ type: 'PURCHASE' })));
const cancel$ = fromEvent(cancelButton, 'click').pipe(map(() => ({ type: 'CANCEL' })));

const selectSlipperA$ = fromEvent(selectSlipperAButton, 'click').pipe(
    map(() => ({ type: 'SELECT_ITEM', id: 'slipperA', name: 'Slipper A', price: 25000 }))
);
const selectSlipperB$ = fromEvent(selectSlipperBButton, 'click').pipe(
    map(() => ({ type: 'SELECT_ITEM', id: 'slipperB', name: 'Slipper B', price: 30000 }))
);

const insert10k$ = fromEvent(insert10kButton, 'click').pipe(
    map(() => ({ type: 'INSERT_MONEY', amount: 10000 }))
);
const insert20k$ = fromEvent(insert20kButton, 'click').pipe(
    map(() => ({ type: 'INSERT_MONEY', amount: 20000 }))
);
const insert50k$ = fromEvent(insert50kButton, 'click').pipe(
    map(() => ({ type: 'INSERT_MONEY', amount: 50000 }))
);

merge(
    start$,
    purchase$,
    cancel$,
    selectSlipperA$,
    selectSlipperB$,
    insert10k$,
    insert20k$,
    insert50k$
).pipe(
    tap(event => console.log("Event dikirim ke mesin:", event))
).subscribe(event => {
    vendingService.send(event);
});

vendingService.subscribe(state => {
    console.log("Status Kembalian:", state.value, "Context:", state.context);

    currentStateDisplay.textContent = typeof state.value === 'string' ? state.value : JSON.stringify(state.value);
    selectedItemDisplay.textContent = state.context.selectedItem ? state.context.selectedItem.name : 'None';
    itemPriceDisplay.textContent = `Rp${state.context.selectedItem ? state.context.selectedItem.price : 0}`;
    insertedMoneyDisplay.textContent = `Rp${state.context.insertedMoney}`;
    changeDisplay.textContent = `Rp${state.context.change}`;

    if (state.value !== 'dispensing' && state.value !== 'returning') {
        if (state.value === 'idle' && state.history?.value !== 'returning') {
            messageDisplay.textContent = 'Tekan MULAI untuk Membeli';
        } else if (state.value === 'selecting') {
            messageDisplay.textContent = 'Pilih Sandal dan Masukkan Uang';
        }
    }
    if (state.matches('idle') && !state.event.type.startsWith('xstate.after')) {
        messageDisplay.textContent = 'Tekan MULAI untuk Membeli';
    }


    startButton.disabled = !state.matches('idle');
    const inSelectingState = state.matches('selecting');
    purchaseButton.disabled = !inSelectingState || !state.can('PURCHASE');
    cancelButton.disabled = !inSelectingState;
    selectSlipperAButton.disabled = !inSelectingState;
    selectSlipperBButton.disabled = !inSelectingState;
    insert10kButton.disabled = !inSelectingState;
    insert20kButton.disabled = !inSelectingState;
    insert50kButton.disabled = !inSelectingState;
});

document.addEventListener('DOMContentLoaded', () => {
    if(vendingService.getSnapshot().matches('idle')) {
        messageDisplay.textContent = 'Tekan MULAI untuk Membeli';
    }
});