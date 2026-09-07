"""Generate OliveCycle landing mock screenshots (Wave 1 Greek + Wave 2 English).
Replace these PNGs with real app captures when ready — keep the same filenames.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
PHONE = (390, 844)
WEB = (1440, 900)

BG = (250, 248, 244)
CREAM = (247, 245, 240)
CARD = (255, 255, 255)
TEXT = (26, 31, 22)
MUTED = (92, 99, 86)
PRIMARY = (45, 80, 22)
ACCENT = (74, 124, 42)
BORDER = (220, 224, 212)
OLIVE_SOFT = (238, 234, 223)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    bold_cands = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    for path in (bold_cands if bold else candidates):
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def round_rect(draw: ImageDraw.ImageDraw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def phone_chrome(img: Image.Image) -> Image.Image:
    """Add subtle status bar content already drawn; return as-is (content fills phone)."""
    return img


def draw_status(draw: ImageDraw.ImageDraw, w: int, lang: str):
    draw.rectangle((0, 0, w, 44), fill=BG)
    draw.text((20, 12), "9:41", fill=TEXT, font=font(14, True))
    draw.text((w - 70, 12), "LTE 100%", fill=MUTED, font=font(12))


def draw_tabbar(draw: ImageDraw.ImageDraw, w: int, h: int, labels: list[str], active: int):
    y = h - 72
    draw.rectangle((0, y, w, h), fill=CARD)
    draw.line((0, y, w, y), fill=BORDER)
    slot = w // len(labels)
    for i, lab in enumerate(labels):
        x = slot * i + slot // 2
        color = PRIMARY if i == active else MUTED
        draw.ellipse((x - 10, y + 10, x + 10, y + 30), fill=color if i == active else OLIVE_SOFT)
        tw = draw.textlength(lab, font=font(11))
        draw.text((x - tw / 2, y + 36), lab, fill=color, font=font(11))


def save(img: Image.Image, name: str):
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    print(f"wrote {path.name}")


def phone_today(lang: str):
    w, h = PHONE
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_status(d, w, lang)
    title = "Σήμερα" if lang == "el" else "Today"
    weather = "22° · Ήλιος" if lang == "el" else "22° · Sunny"
    d.text((24, 56), title, fill=TEXT, font=font(28, True))
    d.text((24, 96), weather, fill=MUTED, font=font(14))

    tasks = (
        [
            ("Κλάδεμα — Κάτω Αλώνια", "Πρωί"),
            ("Λίπανση — Πλάγια", "Μεσημέρι"),
            ("Ψεκασμός — Ρέμα", "Απόγευμα"),
            ("Άρδευση — Παλιός ελαιώνας", "Αύριο"),
        ]
        if lang == "el"
        else [
            ("Pruning — Kato Alonia", "Morning"),
            ("Fertilize — Plagia", "Midday"),
            ("Spray — Rema", "Afternoon"),
            ("Irrigate — Old grove", "Tomorrow"),
        ]
    )
    y = 140
    for i, (name, when) in enumerate(tasks):
        round_rect(d, (20, y, w - 20, y + 88), 14, CARD, BORDER)
        d.ellipse((36, y + 30, 56, y + 50), outline=PRIMARY, width=2)
        if i == 0:
            d.ellipse((40, y + 34, 52, y + 46), fill=ACCENT)
        d.text((72, y + 22), name, fill=TEXT, font=font(15, True))
        d.text((72, y + 50), when, fill=MUTED, font=font(13))
        y += 100

    tabs = ["Σήμερα", "Χωράφια", "Άλλο"] if lang == "el" else ["Today", "Fields", "More"]
    draw_tabbar(d, w, h, tabs, 0)
    save(phone_chrome(img), f"{lang}-phone-today.png")


def phone_fields(lang: str):
    w, h = PHONE
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_status(d, w, lang)
    title = "Χωράφια" if lang == "el" else "Fields"
    d.text((24, 56), title, fill=TEXT, font=font(28, True))
    fields = (
        [
            ("Κάτω Αλώνια", "12 στρ. · Συγκομιδή", "Βαριά χρονιά"),
            ("Πλάγια", "8 στρ. · Ανάπτυξη", "Ελαφριά χρονιά"),
            ("Ρέμα", "15 στρ. · Άνθηση", "Βαριά χρονιά"),
            ("Παλιός ελαιώνας", "6 στρ. · Λήθαργος", "Ελαφριά χρονιά"),
        ]
        if lang == "el"
        else [
            ("Kato Alonia", "1.2 ha · Harvest", "Heavy year"),
            ("Plagia", "0.8 ha · Growth", "Light year"),
            ("Rema", "1.5 ha · Flowering", "Heavy year"),
            ("Old grove", "0.6 ha · Dormancy", "Light year"),
        ]
    )
    y = 120
    for name, meta, year in fields:
        round_rect(d, (20, y, w - 20, y + 100), 14, CARD, BORDER)
        round_rect(d, (32, y + 18, 84, y + 82), 10, OLIVE_SOFT)
        d.text((100, y + 22), name, fill=TEXT, font=font(16, True))
        d.text((100, y + 48), meta, fill=MUTED, font=font(13))
        d.text((100, y + 70), year, fill=PRIMARY, font=font(12, True))
        y += 112
    tabs = ["Σήμερα", "Χωράφια", "Άλλο"] if lang == "el" else ["Today", "Fields", "More"]
    draw_tabbar(d, w, h, tabs, 1)
    save(phone_chrome(img), f"{lang}-phone-fields.png")


def phone_field(lang: str):
    w, h = PHONE
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_status(d, w, lang)
    name = "Κάτω Αλώνια" if lang == "el" else "Kato Alonia"
    stage = "Στάδιο: Συγκομιδή" if lang == "el" else "Stage: Harvest"
    year = "Βαριά χρονιά · 12 στρέμματα" if lang == "el" else "Heavy year · 1.2 ha"
    d.text((24, 56), name, fill=TEXT, font=font(24, True))
    d.text((24, 92), stage, fill=PRIMARY, font=font(14, True))
    d.text((24, 116), year, fill=MUTED, font=font(13))

    round_rect(d, (20, 150, w - 20, 280), 14, OLIVE_SOFT)
    map_label = "Χάρτης χωραφιού" if lang == "el" else "Field map"
    tw = d.textlength(map_label, font=font(14))
    d.text(((w - tw) / 2, 200), map_label, fill=MUTED, font=font(14))

    next_t = "Επόμενη εργασία" if lang == "el" else "Next task"
    task = "Προετοιμασία συγκομιδής" if lang == "el" else "Harvest preparation"
    due = "Έως Παρασκευή" if lang == "el" else "Due Friday"
    d.text((24, 304), next_t, fill=MUTED, font=font(12))
    round_rect(d, (20, 328, w - 20, 420), 14, CARD, BORDER)
    d.text((36, 348), task, fill=TEXT, font=font(15, True))
    d.text((36, 378), due, fill=MUTED, font=font(13))

    notes_t = "Σημειώσεις" if lang == "el" else "Notes"
    note = (
        "Δίχτυα έτοιμα. Μύλος κλεισμένος για Δευτέρα."
        if lang == "el"
        else "Nets ready. Mill booked for Monday."
    )
    d.text((24, 448), notes_t, fill=MUTED, font=font(12))
    round_rect(d, (20, 472, w - 20, 560), 14, CARD, BORDER)
    d.text((36, 500), note, fill=TEXT, font=font(14))
    save(phone_chrome(img), f"{lang}-phone-field.png")


def phone_task(lang: str):
    w, h = PHONE
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_status(d, w, lang)
    title = "Εργασία" if lang == "el" else "Task"
    d.text((24, 56), title, fill=MUTED, font=font(13))
    name = "Κλάδεμα" if lang == "el" else "Pruning"
    field = "Κάτω Αλώνια" if lang == "el" else "Kato Alonia"
    due = "Έως σήμερα, 18:00" if lang == "el" else "Due today, 6:00 pm"
    d.text((24, 84), name, fill=TEXT, font=font(28, True))
    d.text((24, 128), field, fill=PRIMARY, font=font(16, True))
    d.text((24, 158), due, fill=MUTED, font=font(14))

    round_rect(d, (20, 200, w - 20, 360), 14, CARD, BORDER)
    how = "Οδηγίες" if lang == "el" else "Instructions"
    body = (
        "Κλαδέψτε τα χαμηλά κλαδιά.\nΑφήστε τα καρποφόρα.\nΣημειώστε αν χρειάζεται βοήθεια."
        if lang == "el"
        else "Prune the low branches.\nKeep fruiting wood.\nNote if you need help."
    )
    d.text((36, 220), how, fill=MUTED, font=font(12))
    d.text((36, 250), body, fill=TEXT, font=font(15))

    cta = "Ολοκλήρωση" if lang == "el" else "Mark complete"
    round_rect(d, (20, h - 160, w - 20, h - 96), 14, PRIMARY)
    tw = d.textlength(cta, font=font(17, True))
    d.text(((w - tw) / 2, h - 140), cta, fill=(255, 255, 255), font=font(17, True))
    save(phone_chrome(img), f"{lang}-phone-task.png")


def phone_harvest(lang: str):
    w, h = PHONE
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_status(d, w, lang)
    title = "Αυτή η συγκομιδή" if lang == "el" else "This harvest"
    d.text((24, 56), title, fill=TEXT, font=font(26, True))
    sub = "Σεζόν 2025–26" if lang == "el" else "Season 2025–26"
    d.text((24, 96), sub, fill=MUTED, font=font(14))

    cards = (
        [("Ελιές", "4.250 κιλά"), ("Λάδι", "680 κιλά"), ("Έξοδα", "1.840 €"), ("Εισπράξεις", "3.120 €")]
        if lang == "el"
        else [("Olives", "4,250 kg"), ("Oil", "680 kg"), ("Spent", "€1,840"), ("Received", "€3,120")]
    )
    positions = [(20, 140), (200, 140), (20, 260), (200, 260)]
    for (label, value), (x, y) in zip(cards, positions):
        round_rect(d, (x, y, x + 170, y + 100), 14, CARD, BORDER)
        d.text((x + 16, y + 20), label, fill=MUTED, font=font(12))
        d.text((x + 16, y + 48), value, fill=TEXT, font=font(18, True))

    net_l = "Καθαρό" if lang == "el" else "Net"
    net_v = "+1.280 €" if lang == "el" else "+€1,280"
    round_rect(d, (20, 390, w - 20, 480), 14, OLIVE_SOFT)
    d.text((36, 412), net_l, fill=MUTED, font=font(13))
    d.text((36, 438), net_v, fill=PRIMARY, font=font(22, True))

    fields_t = "Ανά χωράφι" if lang == "el" else "By field"
    d.text((24, 510), fields_t, fill=MUTED, font=font(12))
    rows = (
        [("Κάτω Αλώνια", "1.800 κιλά"), ("Πλάγια", "1.100 κιλά"), ("Ρέμα", "1.350 κιλά")]
        if lang == "el"
        else [("Kato Alonia", "1,800 kg"), ("Plagia", "1,100 kg"), ("Rema", "1,350 kg")]
    )
    y = 540
    for name, kg in rows:
        round_rect(d, (20, y, w - 20, y + 56), 12, CARD, BORDER)
        d.text((36, y + 18), name, fill=TEXT, font=font(14, True))
        tw = d.textlength(kg, font=font(14))
        d.text((w - 36 - tw, y + 18), kg, fill=MUTED, font=font(14))
        y += 64
    save(phone_chrome(img), f"{lang}-phone-harvest.png")


def web_money(lang: str):
    w, h = WEB
    img = Image.new("RGB", (w, h), CREAM)
    d = ImageDraw.Draw(img)
    # sidebar
    d.rectangle((0, 0, 220, h), fill=(30, 45, 20))
    brand = "OliveCycle"
    d.text((28, 28), brand, fill=(245, 240, 230), font=font(18, True))
    nav = (
        ["Σήμερα", "Χωράφια", "Χρήματα", "Ημερολόγιο", "Άνθρωποι"]
        if lang == "el"
        else ["Today", "Fields", "Money", "Calendar", "People"]
    )
    y = 100
    for i, item in enumerate(nav):
        if i == 2:
            round_rect(d, (16, y - 8, 204, y + 28), 8, (45, 80, 22))
        d.text((32, y), item, fill=(245, 240, 230), font=font(14))
        y += 44

    title = "Χρήματα" if lang == "el" else "Money"
    d.text((260, 36), title, fill=TEXT, font=font(28, True))
    sub = "Αυτή την εβδομάδα" if lang == "el" else "This week"
    d.text((260, 78), sub, fill=MUTED, font=font(14))

    stats = (
        [("Ξοδέψατε", "1.240 €"), ("Εισπράξατε", "860 €"), ("Υπόλοιπο", "−380 €")]
        if lang == "el"
        else [("Spent", "€1,240"), ("Received", "€860"), ("Left", "−€380")]
    )
    x = 260
    for label, value in stats:
        round_rect(d, (x, 120, x + 280, 220), 16, CARD, BORDER)
        d.text((x + 24, 140), label, fill=MUTED, font=font(14))
        d.text((x + 24, 170), value, fill=TEXT, font=font(26, True))
        x += 300

    list_t = "Πρόσφατα" if lang == "el" else "Recent"
    d.text((260, 260), list_t, fill=TEXT, font=font(18, True))
    rows = (
        [
            ("Εργατικά συγκομιδής", "Κάτω Αλώνια", "−420 €"),
            ("Λίπασμα", "Πλάγια", "−180 €"),
            ("Μύλος", "Ρέμα", "−260 €"),
            ("Πώληση λαδιού", "Κάτω Αλώνια", "+860 €"),
        ]
        if lang == "el"
        else [
            ("Harvest labor", "Kato Alonia", "−€420"),
            ("Fertilizer", "Plagia", "−€180"),
            ("Mill", "Rema", "−€260"),
            ("Oil sale", "Kato Alonia", "+€860"),
        ]
    )
    y = 300
    for label, field, amount in rows:
        round_rect(d, (260, y, w - 40, y + 72), 12, CARD, BORDER)
        d.text((284, y + 16), label, fill=TEXT, font=font(15, True))
        d.text((284, y + 42), field, fill=MUTED, font=font(13))
        color = PRIMARY if amount.startswith("+") else TEXT
        tw = d.textlength(amount, font=font(16, True))
        d.text((w - 64 - tw, y + 26), amount, fill=color, font=font(16, True))
        y += 84
    save(img, f"{lang}-web-money.png")


def web_field(lang: str):
    w, h = WEB
    img = Image.new("RGB", (w, h), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 220, h), fill=(30, 45, 20))
    d.text((28, 28), "OliveCycle", fill=(245, 240, 230), font=font(18, True))
    nav = (
        ["Σήμερα", "Χωράφια", "Χρήματα", "Ημερολόγιο"]
        if lang == "el"
        else ["Today", "Fields", "Money", "Calendar"]
    )
    y = 100
    for i, item in enumerate(nav):
        if i == 1:
            round_rect(d, (16, y - 8, 204, y + 28), 8, (45, 80, 22))
        d.text((32, y), item, fill=(245, 240, 230), font=font(14))
        y += 44

    name = "Κάτω Αλώνια" if lang == "el" else "Kato Alonia"
    stage = "Συγκομιδή · Βαριά χρονιά" if lang == "el" else "Harvest · Heavy year"
    d.text((260, 36), name, fill=TEXT, font=font(28, True))
    d.text((260, 78), stage, fill=PRIMARY, font=font(15, True))

    round_rect(d, (260, 120, 900, 520), 16, OLIVE_SOFT)
    map_l = "Χάρτης ελαιώνα" if lang == "el" else "Grove map"
    tw = d.textlength(map_l, font=font(16))
    d.text((260 + (640 - tw) / 2, 300), map_l, fill=MUTED, font=font(16))

    tasks_t = "Εργασίες" if lang == "el" else "Tasks"
    d.text((940, 120), tasks_t, fill=TEXT, font=font(18, True))
    tasks = (
        [("Προετοιμασία", "Ανοιχτή"), ("Καθημερινή συλλογή", "Σήμερα"), ("Παράδοση μύλου", "Επόμενη")]
        if lang == "el"
        else [("Prepare", "Open"), ("Daily picking", "Today"), ("Mill delivery", "Next")]
    )
    y = 160
    for tname, status in tasks:
        round_rect(d, (940, y, w - 40, y + 90), 12, CARD, BORDER)
        d.text((960, y + 22), tname, fill=TEXT, font=font(15, True))
        d.text((960, y + 50), status, fill=MUTED, font=font(13))
        y += 104

    note_t = "Σημείωση" if lang == "el" else "Note"
    note = (
        "Το χωράφι φαίνεται καθαρά — ιδιοκτήτης και παραγωγός στην ίδια σελίδα."
        if lang == "el"
        else "The grove is clear — owner and producer on the same page."
    )
    round_rect(d, (260, 560, 900, 680), 14, CARD, BORDER)
    d.text((284, 580), note_t, fill=MUTED, font=font(12))
    d.text((284, 612), note, fill=TEXT, font=font(14))
    save(img, f"{lang}-web-field.png")


def main():
    for lang in ("el", "en"):
        phone_today(lang)
        phone_fields(lang)
        phone_field(lang)
        phone_task(lang)
        phone_harvest(lang)
        web_money(lang)
        web_field(lang)
    print("done")


if __name__ == "__main__":
    main()
