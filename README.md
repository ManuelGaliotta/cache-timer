# cache-timer

Mod per Claude Code che mostra, sopra la casella del prompt, una riga di barre sottili:

- **● cache**: quanto è passato della finestra di 1 ora della prompt cache dall'ultima risposta. Il pallino
  è blu se va tutto bene, rosso negli ultimi 5 minuti o a cache scaduta, tenue mentre Claude risponde.
- **contesto**: quanto è pieno il contesto della sessione (rossa oltre il 90%).
- **5h** e **7g**: i limiti d'uso a 5 ore e settimanale (rossi oltre il 90%). Il segno `┃` indica quanto
  tempo è passato della finestra: se la parte blu lo supera, stai consumando più in fretta del tempo.

In più:

- **5 minuti prima della scadenza della cache**, se non hai scritto nulla, la mod lancia la skill `handoff`
  per salvare lo stato del lavoro.
- **Al primo messaggio dopo la scadenza** lo ferma con un avviso che consiglia di aprire una nuova sessione
  e scrivere «riprendi dall'ultimo handoff»; reinviando il messaggio si continua nella sessione.

La skill `handoff` è inclusa nel plugin (`skills/handoff/`, invocabile come `cache-timer:handoff`): salva la
nota di ripresa in `~/.claude/handoffs/<nome-cartella-progetto>/`. Il TTL della cache è fisso a 1 ora
(`TTL_MS` in `hooks/register.tsx`).

## Installazione

Al prompt di una sessione Claude Code nel terminale:

```
/plugin install cache-timer --marketplace ManuelGaliotta/cache-timer
```

Da una shell:

```
claude plugin install cache-timer --marketplace ManuelGaliotta/cache-timer
```

Nell'app desktop, dove `/plugin` non funziona: clic su + accanto alla casella del prompt, poi Plugins,
Add marketplace con `ManuelGaliotta/cache-timer`, poi Add plugin.
