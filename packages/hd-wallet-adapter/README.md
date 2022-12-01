# @nixjs23n6/hd-wallet-adapter

A tiny object utility.

## Quick Setup

### Install

`yarn add @nixjs23n6/hd-wallet-adapter`

### Usage

```typescript
import { Aptos, SUI, Vault, BaseEnums } from '@nixjs23n6/hd-wallet-adapter'

// generate hd wallet by provider: APTOS/SUI...
const vault = new Vault([Aptos.AptosVault, SUI.SUIVault])
vault.connect(BaseEnums.Provider.APTOS)

vault.instance.getAccountFromMnemonic(0, 'embody axis few green amateur seek weekend city manage clap flip utility').then(console.log)
vault.instance.getAccountFromMnemonic(1, 'embody axis few green amateur seek weekend city manage clap flip utility').then(console.log)
vault.instance.getAccountFromMnemonic(2, 'embody axis few green amateur seek weekend city manage clap flip utility').then(console.log)

// generate all hd wallets
const vault = new Vault([SUIVault, AptosVault], undefined, 'embody axis few green amateur seek weekend city manage clap flip utility'')
vault.generateHDWallets().then(console.log)
```
