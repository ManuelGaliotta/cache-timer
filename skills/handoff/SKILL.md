---
name: handoff
description: Salva lo stato del lavoro della sessione corrente in un file di handoff, per ripartire in una sessione nuova senza perdere il filo. Usare quando la mod cache-timer avvisa che la prompt cache sta per scadere, quando l'utente chiede "fai l'handoff", "salva lo stato", "chiudiamo qui e riprendiamo dopo", oppure in una sessione nuova quando chiede "riprendi dall'ultimo handoff".
---

# Handoff di sessione

Due modalità: **salva** (fine sessione) e **riprendi** (inizio sessione nuova).

## Salva

1. Ricostruisci dalla conversazione: obiettivo dell'utente, cosa è fatto (file toccati, commit, query
   lanciate), cosa è in corso, cosa resta, decisioni prese e domande aperte all'utente.
2. Se il progetto ha regole proprie sullo stato del lavoro (nel `CLAUDE.md` del progetto, per esempio
   una pagina di stato dell'iniziativa e l'handoff del deliverable), aggiornale come prescrivono.
   Non committare nulla senza che l'utente l'abbia chiesto.
3. Scrivi sempre anche la nota di ripresa in
   `~/.claude/handoffs/<nome-cartella-progetto>/<AAAA-MM-GG_HHMM>.md`, con queste sezioni:
   - **Obiettivo** (una riga)
   - **Fatto** (elenco, con i path dei file)
   - **In corso / prossimo passo** (il primo comando o la prima azione da fare alla ripresa)
   - **Aperti e domande per l'utente**
   - **File di stato del progetto aggiornati** (path, se il punto 2 si applica)
   Niente dati personali o credenziali: solo struttura, path e logica.
4. Chiudi con una riga sola: dove sta la nota e che alla ripresa basta aprire una sessione nuova e
   scrivere «riprendi dall'ultimo handoff».

## Riprendi

1. Trova la nota più recente in `~/.claude/handoffs/<nome-cartella-progetto>/` (ordine per nome).
2. Leggila, poi leggi i file di stato del progetto che cita.
3. Riassumi all'utente in 3–5 righe dove eravate e proponi il prossimo passo; non eseguirlo
   finché l'utente non conferma.
