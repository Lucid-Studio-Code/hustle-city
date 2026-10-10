# Articles de départ de biffcity.fr/actus (versés dans landing/content.json par : python3 tools/articles-src.py)
# Format du texte : « ## » intertitre, « ### » sous-titre, « - » liste, **gras**, [texte](/actus/slug) lien interne, [texte](jeu) lien vers le jeu.
import json, pathlib

A = [
dict(slug='jeu-paris-sportifs-fictifs', date='2026-10-09', img='/assets/img/load-7.jpg', imgPos='50% 30%',
 title='Jeu de paris sportifs fictifs gratuit : parie sans argent réel',
 desc='Biff City est un jeu de paris sportifs fictifs gratuit : foot, basket et tennis en direct, cotes, combinés, zéro argent réel. Bêta ouverte.',
 h1='Un jeu de paris sportifs fictifs, gratuit et sans argent réel',
 alt='La Sportive célèbre un pari gagné dans le stade de Biff City',
 lead="Envie de parier sur un match sans risquer un centime ? Biff City est un jeu mobile où tu paries avec de l'argent fictif sur des matchs qui se jouent en direct, et où chaque gain te sert à faire grimper ton patrimoine.",
 body="""## Comment marchent les paris dans Biff City
Tout se passe au **Royal**, le bar des parieurs de la ville. Des matchs fictifs s'y jouent en continu entre équipes inventées, dans trois sports :
- le **foot**, où tu peux aussi parier sur le match nul ;
- le **basket** ;
- le **tennis**.
Et pendant le **Tournoi des 6 Quartiers**, des pronos sur le rugby.
Chaque match a ses cotes. Tu choisis ton vainqueur, ta mise, et tu suis le match en direct : le score évolue, l'arbitre siffle, les supporters explosent à chaque but. Les plus joueurs tentent le **pari combiné** : plusieurs pronostics sur le même ticket, une cote qui grimpe, et tout se joue sur le dernier match.

## Un simulateur de paris, sans le risque
L'argent de Biff City est **entièrement fictif** : il ne s'achète pas pour parier et ne se retire jamais. C'est ce qui en fait un vrai terrain d'entraînement pour comprendre les cotes, la gestion d'une mise ou la tentation du combiné, sans conséquence sur ton compte en banque. Le jeu est réservé aux plus de 18 ans.

## Les tuyaux du Kiosque
Un journal sort toutes les 30 minutes au **Kiosque**. On y achète des tuyaux sur les prochains matchs. Fiables… la plupart du temps : un bon parieur sait aussi quand ne pas les croire.

## Parier n'est qu'une partie du jeu
Tes gains servent à tout le reste. Tu peux les placer en [cryptomonnaies fictives](/actus/jeu-crypto-sans-argent), les tenter au [Lucky Palace, le casino gratuit](/actus/machine-a-sous-gratuite) de la ville, ou les dépenser au [Club](/actus/club-biff-city). Chaque niveau débloque de nouveaux lieux, jusqu'au niveau 40.

## Pendant la Coupe des Morts, chaque pari compte pour ton équipe
Du 24 octobre au 2 novembre, chaque pari gagné rapporte des points à ton équipe pour la [Coupe des Morts](/actus/coupe-des-morts), l'événement d'Halloween de Biff City.

## Jouer maintenant
La bêta est ouverte, gratuite, et se joue directement dans le navigateur de ton téléphone. [Lance ta première mise au Royal](jeu)."""),

dict(slug='machine-a-sous-gratuite', date='2026-10-08', img='/assets/img/load-3.jpg', imgPos='50% 35%',
 title='Machine à sous gratuite sans argent réel : le Lucky Palace',
 desc='Machine à sous et roulette gratuites, sans argent réel ni téléchargement : découvre le Lucky Palace, le casino de Biff City, avec son taux de retour affiché.',
 h1='Le Lucky Palace, la machine à sous gratuite de Biff City',
 alt='Le Flambeur devant la machine à sous du Lucky Palace',
 lead="Le casino de Biff City vient d'être entièrement relooké. Machine à sous, roulette européenne : tout se joue avec de l'argent fictif, pour le frisson sans la facture.",
 body="""## Une machine à sous qui a du style
La machine du Lucky Palace tourne sur **3 rouleaux** et **6 symboles** détournés des machines classiques :
- la cerise à lunettes ;
- le citron casquette ;
- la cloche ;
- les lingots « BAR » ;
- le diamant ;
- et le **7 à chaîne en or**, le plus recherché.
Les gains vont de **×2 à ×500** la mise. Et parce qu'on préfère être honnête, le taux de retour est affiché dans le jeu : environ 94 %. Sur la durée, la machine gagne toujours un peu plus que toi. C'est vrai partout, autant le savoir.

## La roulette européenne
Juste à côté, une vraie roulette à 37 cases. Numéros pleins, douzaines, rouge ou noir, pair ou impair, manque ou passe : toutes les mises classiques, avec les paiements officiels.

## Un casino gratuit, vraiment
Pas de dépôt, pas de retrait : l'argent du Lucky Palace est **fictif**, il se gagne en jouant ailleurs dans la ville, par exemple avec les [paris sportifs fictifs du Royal](/actus/jeu-paris-sportifs-fictifs). Le jeu est réservé aux plus de 18 ans.

## Les tickets à gratter
Pour une pause rapide, six tickets à gratter au doigt t'attendent, du Cash Flash au Millionnaire du Quartier.

## Et après ?
Les gros gains se placent au [Club](/actus/club-biff-city), en [crypto](/actus/jeu-crypto-sans-argent) ou dans ta collection. [Va tenter le 7 en or](jeu)."""),

dict(slug='club-biff-city', date='2026-10-07', img='/assets/img/club-piste.webp', imgPos='50% 35%',
 title="Le Club de Biff City : une boîte de nuit où chaque choix compte",
 desc="Piste, bar, DJ, carré VIP et toilettes louches : dans le Club de Biff City, 2 actions par soirée et des dialogues qui rapportent gros… ou coûtent cher.",
 h1="Le Club de Biff City ouvre ses portes",
 alt="La piste de danse du Club de Biff City",
 lead="Passé le videur, la nuit t'appartient. Mais seulement deux fois : dans le Club de Biff City, chaque soirée se joue en deux choix, et chacun peut changer ta partie.",
 body="""## Cinq coins, deux actions
La salle s'ouvre en plein écran avec cinq coins :
- **la piste**, pour danser et faire des rencontres ;
- **le bar**, pour une tournée ou une confidence ;
- **le DJ**, qui peut lancer ta soirée ;
- **le carré VIP**, où se négocient les affaires ;
- **les toilettes**, où il se passe des choses louches.
Tu n'as que **deux actions par soirée**. Il faut donc choisir où aller, et avec qui parler.

## Des dialogues avec bonus et malus
Chaque coin ouvre une scène avec un personnage et plusieurs réponses possibles. Une bonne réplique peut te rapporter de l'XP, du cash, des lingots, un booster de cartes, ou un **nouveau contact** qui te proposera une affaire par message. Une mauvaise peut te coûter ta veste… ou ton argent. Certains tuyaux glanés au Club sont vrais, d'autres non.

## Qui sera là ce soir ?
Dix personnages fréquentent le Club, et le jeu tire au sort qui se trouve dans chaque coin à chaque soirée. Fais leur connaissance dans [les personnages du Club](/actus/personnages-du-club).

## Comment entrer
Le Club se débloque au niveau 5. L'entrée se paie au videur, ou en lingots pour revenir avant la fin de l'attente. Pour remplir ton portefeuille avant de sortir, rien de tel qu'une soirée de [paris sportifs fictifs](/actus/jeu-paris-sportifs-fictifs).

[Entre dans le Club](jeu)"""),

dict(slug='personnages-du-club', date='2026-10-07', img='/assets/img/club-vip.jpg', imgPos='50% 40%',
 title='Les 10 personnages du Club de Biff City',
 desc="Kenza, Léa, DJ Nyx, le Baron, Valentina… Découvre les 10 personnages du Club de Biff City et ce qu'ils peuvent t'apporter pendant une soirée.",
 h1='Les 10 personnages du Club',
 alt='Le carré VIP du Club de Biff City',
 lead="Chaque soirée au Club se joue en deux rencontres. Voici qui tu peux croiser, et pourquoi il vaut mieux bien choisir ses mots.",
 body="""## Sur la piste
**Léa** filme la piste pour sa story. **Kenza** danse au milieu de la foule et ne se laisse pas aborder par n'importe qui. Une bonne danse peut te faire gagner de l'XP… ou te faire glisser devant tout le monde.

## Au bar
**Chloé**, influenceuse, cherche quelqu'un pour sa prochaine vidéo. **Hugo**, trader un peu trop arrosé, lâche parfois des confidences sur le marché. À toi de savoir si elles valent quelque chose.

## Aux platines
**DJ Nyx** et **DJ Max** tiennent les platines selon les soirs. Un pourboire bien placé et c'est toute la salle qui vibre pour toi.

## Dans le carré VIP
**Le Baron** et **Valentina** règnent sur le carré. S'asseoir à leur table peut te valoir un contact précieux, qui t'enverra ensuite des affaires par message dans le téléphone du jeu.

## Près des toilettes
**Johnny** et **le Vendeur** traînent dans le coin le plus louche du Club. Leurs propositions sont tentantes. Elles ne sont pas toujours honnêtes.

## Un casting qui change chaque soir
Le jeu tire au sort qui est présent dans chaque coin. Deux soirées ne se ressemblent jamais. Tout savoir sur le fonctionnement du lieu : [le Club de Biff City](/actus/club-biff-city).

[Rencontre-les ce soir](jeu)"""),

dict(slug='coupe-des-morts', date='2026-10-09', img='/assets/img/ev-cdm-bg.webp', imgPos='50% 30%',
 title="Coupe des Morts : l'événement d'Halloween de Biff City",
 desc="Du 24 octobre au 2 novembre, choisis ton équipe (Zombies, Vampires, Démons ou Fantômes), marque des points et gagne cartes, décos et lingots exclusifs.",
 h1="La Coupe des Morts, l'événement d'Halloween",
 alt="La ville de Biff City décorée pour la Coupe des Morts",
 lead="Du 24 octobre au 2 novembre, Biff City se couvre de citrouilles. Quatre équipes de créatures s'affrontent, et c'est toi qui fais gagner la tienne.",
 body="""## Choisis ton camp
Quatre équipes, quatre devises :
- les **Zombies** : « On lâche rien, même mort. » ;
- les **Vampires** : « On sort la nuit, on rentre riches. » ;
- les **Démons** : « On met le feu au quartier. » ;
- les **Fantômes** : « Tu nous vois pas, mais on est partout. »
L'équipe qui compte le moins de joueurs reçoit un **bonus outsider de +20 %** sur ses points : rejoindre le petit camp peut être le meilleur calcul.

## Comment marquer des points
Presque tout ce que tu fais dans la ville rapporte des points à ton équipe : un pari gagné au Royal, un tour au casino, un booster ouvert, une crypto revendue en bénéfice, une soirée au [Club](/actus/club-biff-city). Chaque nuit, **trois défis** tirés au sort donnent un bonus de points et de bonbons.

## Les récompenses
- Des **paliers personnels** : cash, lingots, boosters, décos de ville et cadre d'avatar.
- Une **boutique en bonbons**, ouverte seulement pendant l'événement : décos, pin's, boosters.
- Une **récompense d'équipe** à la fin, selon la place de ton camp, avec un coffre pour l'équipe gagnante.
- Une **série de cartes** dédiée : pendant la Coupe, plus d'un tiers des cartes des boosters en viennent.
Et tous ceux qui ont joué repartent avec la Coupe des Morts en trophée pour leur appartement.

## Se préparer dès maintenant
Commence ta partie avant le 24 octobre pour arriver avec un niveau qui débloque le casino et le Club. Le plus rapide : enchaîner les [paris sportifs fictifs](/actus/jeu-paris-sportifs-fictifs).

[Choisis ton équipe](jeu)"""),

dict(slug='collection-beta', date='2026-10-09', img='/assets/img/bg-lp-beta.jpg', imgPos='50% 40%',
 title='La collection Bêta : des cartes réservées aux premiers joueurs',
 desc="Une série de cartes à collectionner réservée aux joueurs de la bêta de Biff City, qui ne sera plus jamais distribuée après la sortie. Comment l'obtenir.",
 h1='La collection Bêta, réservée aux premiers joueurs',
 alt='Le Survêt ouvre un paquet de cartes holographiques',
 lead="Ceux qui jouent pendant la bêta auront quelque chose que les autres n'auront jamais : une série de cartes qui disparaîtra définitivement à la sortie du jeu.",
 body="""## La collection de cartes de Biff City
Biff City est aussi un jeu de **cartes à collectionner**. Les boosters s'ouvrent avec une vraie mise en scène : le paquet tremble, se déchire, et les cartes se retournent une à une avec un son qui monte selon leur rareté. Quatre raretés existent, de Commune à Légendaire, avec des probabilités affichées. En grand, les cartes ont des reflets holographiques et penchent quand tu bouges ton téléphone.

## Une série qui ne reviendra pas
La collection Bêta est une série à part, distribuée **uniquement pendant la bêta**. Une fois le jeu sorti sur l'App Store et Google Play, elle ne sera plus jamais donnée ni vendue. Ta partie te suivra dans l'application : tes cartes Bêta aussi. Plus d'infos sur [la sortie sur iPhone et Android](/actus/biff-city-iphone-android).

## Comment l'obtenir
Il suffit de jouer pendant la bêta. Et pour aller plus vite, [chaque retour utile sur le jeu est récompensé](/actus/avis-beta-recompense).

[Commence ta collection](jeu)"""),

dict(slug='avis-beta-recompense', date='2026-10-09', img='/assets/img/bg-lp-avis.jpg', imgPos='50% 35%',
 title='Bêta testeur de Biff City : ton avis rapporte des récompenses',
 desc="Deviens bêta testeur de Biff City : chaque retour utile sur une fonctionnalité te rapporte des lingots et des boosters. Comment envoyer ton avis.",
 h1='Ton avis rapporte : deviens bêta testeur',
 alt='Une joueuse envoie son avis depuis son téléphone',
 lead="La bêta de Biff City sert à une chose : construire le jeu avec ses joueurs. Alors chaque retour utile est récompensé.",
 body="""## Comment envoyer ton avis
Dans le jeu, ouvre les **Réglages** et touche « Donner mon avis ». Tu peux signaler un bug, proposer une idée ou dire ce qui te plaît moins. Ton message arrive directement à l'équipe, qui te répond dans la messagerie du téléphone du jeu.

## Ce que ça rapporte
Quand ton retour est utile (un bug trouvé, une idée retenue, une remarque qui fait avancer le jeu), tu reçois des **lingots** et des **boosters** directement dans ta partie, avec une notification.

## Ce qui nous aide le plus
- Un bug précis : où tu étais, ce que tu as touché, ce qui s'est passé.
- Un avis sur une nouveauté : le [Club](/actus/club-biff-city), le [Lucky Palace](/actus/machine-a-sous-gratuite), les paris.
- Ce qui t'a donné envie de revenir, ou d'arrêter.

## Et en plus
Jouer pendant la bêta te donne accès à [la collection Bêta](/actus/collection-beta), une série de cartes qui ne sera plus distribuée après la sortie.

[Joue et donne ton avis](jeu)"""),

dict(slug='biff-city-iphone-android', date='2026-10-09', img='/assets/img/load-2.jpg', imgPos='50% 38%',
 title='Biff City sur iPhone et Android : sortie et bêta',
 desc="Biff City arrive sur l'App Store et Google Play. En attendant, la bêta se joue gratuitement dans le navigateur, et ta partie te suivra dans l'application.",
 h1="Biff City arrive sur l'App Store et Google Play",
 alt='Le Survêt joue à Biff City sur son téléphone',
 lead="Biff City sortira en application sur iPhone et Android. Pas besoin d'attendre pour jouer : la bêta est déjà ouverte.",
 body="""## Jouer dès maintenant, sans téléchargement
La bêta se joue dans le navigateur de ton téléphone ou de ton ordinateur. Sur iPhone comme sur Android, tu peux l'**ajouter à ton écran d'accueil** : elle s'ouvre alors en plein écran, comme une vraie application.

## Ta partie te suivra
Ta progression est sauvegardée sur nos serveurs et se synchronise entre tes appareils. Le jour de la sortie, tu retrouveras ton niveau, ton argent fictif, tes objets et ta collection dans l'application, y compris tes cartes de [la collection Bêta](/actus/collection-beta).

## Ce qui t'attend
- Des [paris sportifs fictifs](/actus/jeu-paris-sportifs-fictifs) en direct sur le foot, le basket et le tennis.
- Un [casino gratuit](/actus/machine-a-sous-gratuite) avec machine à sous et roulette.
- Des [cryptos fictives](/actus/jeu-crypto-sans-argent) dont le cours bouge en continu.
- Une boîte de nuit, [le Club](/actus/club-biff-city), et une collection de cartes, de sneakers, de montres et de voitures.

Le jeu est gratuit, réservé aux plus de 18 ans, et fonctionne uniquement avec de l'argent fictif.

[Lancer la bêta](jeu)"""),

dict(slug='jeu-crypto-sans-argent', date='2026-10-09', img='/assets/img/load-5.jpg', imgPos='50% 30%',
 title='Jeu de crypto sans argent réel : apprends à trader sans risque',
 desc='Achète, revends et mine des cryptomonnaies fictives dont le cours bouge en direct. Un jeu de trading crypto gratuit, sans argent réel, dans Biff City.',
 h1="Un jeu de crypto pour trader sans argent réel",
 alt='Le Hoodie à côté de sa machine de minage dans son grenier',
 lead="Acheter au plus bas, revendre au plus haut, résister à la panique quand tout plonge : dans Biff City, tu t'y essaies avec des cryptos fictives et zéro risque.",
 body="""## Six cryptos qui ne dorment jamais
Depuis le PC de ton appartement, tu suis six cryptomonnaies inventées : **Axion, Vektor, Nova, PigeonCoin, KebabCoin et Zéphyr**. Leur cours bouge en continu, avec des alertes « flash » quand l'une bondit ou s'effondre d'un coup. Les ordres automatiques te permettent de vendre ou d'acheter à un prix fixé, même quand tu n'es pas là.

## La machine de minage
Dans un coin de l'appart, ta machine de minage tourne. Tu choisis la durée : courte et sûre, ou longue et plus rentable. Mais elle chauffe, et si tu ne la refroidis pas, elle peut griller.

## La bourse et l'immobilier
Pour diversifier, six actions fictives s'échangent à la Bourse, et quatre biens immobiliers rapportent des loyers à encaisser.

## Pourquoi un jeu plutôt que la vraie crypto
L'argent de Biff City est entièrement **fictif**. C'est un terrain d'essai pour comprendre la volatilité, la tentation de tout vendre trop tôt, ou celle de croire une rumeur. D'ailleurs, les tuyaux du Kiosque et du [Club](/actus/club-biff-city) ne sont pas toujours vrais.

## Le capital de départ
Tes premières cryptos s'achètent avec ce que tu gagnes ailleurs, par exemple avec les [paris sportifs fictifs du Royal](/actus/jeu-paris-sportifs-fictifs).

[Ouvre ton portefeuille crypto](jeu)""")
]

p = pathlib.Path(__file__).parent.parent / 'landing/content.json'
c = json.loads(p.read_text())
c['articles'] = A
# chaque bannière et chaque carte mène à son article
links = {'Le Club ouvre ses portes': 'club-biff-city', 'Le Lucky Palace relooké': 'machine-a-sous-gratuite', '10 personnages au Club': 'personnages-du-club', 'Joue avant tout le monde': 'jeu-paris-sportifs-fictifs',
         'La Coupe des Morts': 'coupe-des-morts', 'La collection Bêta': 'collection-beta', 'Ton avis rapporte': 'avis-beta-recompense', "Sur l'App Store et Google Play": 'biff-city-iphone-android'}
for x in c['actus']['items'] + c['bientot']['items']:
    x['link'] = links.get(x['title'], ''); x['btn'] = 'En savoir plus'
for x in c['bientot']['items']:
    if x['title'] == 'La collection Bêta': x['img'] = '/assets/img/bg-lp-beta.jpg'; x['imgPos'] = '50% 40%'; x['alt'] = 'Le Survêt ouvre un paquet de cartes holographiques'
p.write_text(json.dumps(c, ensure_ascii=False, indent=1))
print(len(A), 'articles')
