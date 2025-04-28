document.addEventListener('DOMContentLoaded', () => {
  const vendingMachineConfig = {
    id: 'slipperVendingMachine',
    initial: 'idle',
    context: {
      insertedMoney: 0,
      selectedItem: null,   
      change: 0
    },
    states: {
      idle: {
        entry: 'resetMachine',
        on: { START: 'selecting' }
      },
      selecting: {
        entry: 'showSelectionScreen',
        on: {
          SELECT_ITEM: { actions: 'setSelectedItem' },
          INSERT_MONEY: { actions: 'addMoney' },
          PURCHASE: { target: 'dispensing', cond: 'hasSufficientFunds' },
          CANCEL: { target: 'returning', actions: 'calculateChange' }
        }
      },
      dispensing: {
        entry: 'displayDispensingMessage',
        after: {
          2000: { target: 'returning', actions: ['dispenseItem', 'calculateChange'] }
        }
      },
      returning: {
        entry: 'displayReturningChange',
        after: {
          2000: { target: 'idle', actions: 'dispenseChange' }
        }
      }
    }
  };

  const vendingMachineOptions = {
    actions: {
      resetMachine: (context) => {
        context.insertedMoney = 0;
        context.selectedItem = null;
        context.change = 0;
        showScreen('idle-screen');
        updateDisplay('Selamat Datang di Sandal Vending Machine!');
        resetDispensed();
        updateInsertedAmount(0);
        updateSelectedItem('Tidak Ada');
        disablePurchaseButton();
        clearSelectedProducts();
      },
      showSelectionScreen: () => {
        showScreen('selection-screen');
        updateDisplay('Silakan pilih produk dan masukkan uang');
      },
      setSelectedItem: (context, event) => {
        context.selectedItem = { id: event.id, name: event.name, price: event.price };
        updateSelectedItem(event.name);
        highlightSelectedProduct(event.id);
        updateDisplay(`Dipilih: ${event.name} - Rp${event.price}.000`);
        if (context.insertedMoney < event.price) {
          updateDisplay(`Dipilih: ${event.name} - Rp${event.price}.000. Perlu Rp${(event.price - context.insertedMoney)}.000 lagi`);
          disablePurchaseButton();
        } else {
          updateDisplay(`Dipilih: ${event.name} - Siap untuk dibeli!`);
          enablePurchaseButton();
        }
      },
      addMoney: (context, event) => {
        context.insertedMoney += event.amount;
        updateInsertedAmount(context.insertedMoney);
        if (context.selectedItem) {
          const remaining = context.selectedItem.price - context.insertedMoney;
          if (remaining > 0) {
            updateDisplay(`Ditambahkan Rp${event.amount}.000. Total: Rp${context.insertedMoney}.000. Perlu Rp${remaining}.000 lagi`);
            disablePurchaseButton();
          } else {
            updateDisplay(`Ditambahkan Rp${event.amount}.000. Siap untuk dibeli!`);
            enablePurchaseButton();
          }
        } else {
          updateDisplay(`Ditambahkan Rp${event.amount}.000. Total: Rp${context.insertedMoney}.000`);
        }
      },
      calculateChange: (context) => {
        context.change = context.selectedItem ? Math.max(0, context.insertedMoney - context.selectedItem.price) : context.insertedMoney;
      },
      displayDispensingMessage: (context) => {
        updateDisplay(`Mengeluarkan ${context.selectedItem.name}...`);
      },
      dispenseItem: (context) => {
        document.getElementById('dispensed').innerHTML = `<h3>Ini ${context.selectedItem.name} Anda!</h3>`;
      },
      displayReturningChange: (context) => {
        if (context.change > 0) {
          updateDisplay(`Transaksi selesai. Mengembalikan kembalian: Rp${context.change}.000`);
        } else {
          updateDisplay('Terima kasih atas pembelian Anda!');
        }
      },
      dispenseChange: (context) => {
        if (context.change > 0) {
          document.getElementById('dispensed').innerHTML += `<div>Kembalian: Rp${context.change}.000</div>`;
        }
      }
    },
    guards: {
      hasSufficientFunds: (context) => context.selectedItem && context.insertedMoney >= context.selectedItem.price
    }
  };

  const vendingMachine = XState.Machine(vendingMachineConfig, vendingMachineOptions);
  const service = XState.interpret(vendingMachine)
    .onTransition(state => {
      document.getElementById('current-state').textContent = state.value;
      document.getElementById('context-data').textContent = JSON.stringify({
        insertedMoney: state.context.insertedMoney,
        selectedItem: state.context.selectedItem?.name || 'Tidak Ada',
        change: state.context.change
      }, null, 2);
    })
    .start();

  document.getElementById('start-button').addEventListener('click', () => service.send('START'));
  document.querySelectorAll('.product').forEach(el => {
    el.addEventListener('click', () => {
      service.send({ type: 'SELECT_ITEM', id: el.dataset.id, name: el.dataset.name, price: parseFloat(el.dataset.price) });
    });
  });
  document.querySelectorAll('.coin').forEach(el => {
    el.addEventListener('click', () => {
      service.send({ type: 'INSERT_MONEY', amount: parseFloat(el.dataset.value) });
    });
  });
  document.getElementById('purchase-button').addEventListener('click', () => service.send('PURCHASE'));
  document.getElementById('cancel-button').addEventListener('click', () => service.send('CANCEL'));

  function showScreen(screenId) {
    document.getElementById('idle-screen').style.display = 'none';
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById(screenId).style.display = 'block';
  }
  function updateDisplay(message) {
    document.getElementById('display').textContent = message;
  }
  function updateInsertedAmount(amount) {
    document.getElementById('inserted-amount').textContent = amount + '.000';
  }
  function updateSelectedItem(name) {
    document.getElementById('selected-item').textContent = name;
  }
  function resetDispensed() {
    document.getElementById('dispensed').textContent = 'Produk Anda akan muncul di sini';
  }
  function enablePurchaseButton() {
    document.getElementById('purchase-button').disabled = false;
  }
  function disablePurchaseButton() {
    document.getElementById('purchase-button').disabled = true;
  }
  function clearSelectedProducts() {
    document.querySelectorAll('.product').forEach(el => el.classList.remove('selected'));
  }
  function highlightSelectedProduct(id) {
    clearSelectedProducts();
    document.querySelectorAll('.product').forEach(el => {
      if (el.dataset.id === id) el.classList.add('selected');
    });
  }
});