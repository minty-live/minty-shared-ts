// The one file preview (src/filePreview/FilePreview.tsx; moved from minty-payment-request-web, v0.37).
//
// The rule it exists to keep: a file NEVER leaves the app. It used to open in a new tab, so
// the assertions worth pinning are the absence of any link or download, and the keyboard
// contract that lets it stack over a modal - Escape closes the viewer and nothing else,
// because it listens in the capture phase.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AttachmentFullScreenViewer,
  FilePreviewPane,
  fileIconInfo,
  fileToPreviewItem,
  formatFileSize,
  nameToPreviewMime,
  PreviewBlock,
  resolvePreviewMime,
  type AttachmentPreviewItem,
  registerFilePreviewHost,
} from "../index";

// pdf.js needs a canvas, which jsdom has not got, so the renderer is stubbed at its module
// boundary and named instead - rendering one for real is e2e's job.
vi.mock("../PdfPreview", () => ({
  PdfJsCanvasPreview: ({ title, src }: { title?: string; src?: string }) => (
    <div data-pdf={src}>{`pdf: ${title}`}</div>
  ),
}));
// the authenticated fetch of a file through the API (a HEIC's JPEG, made on the fly)
const fetchProxyBlob = vi.fn<(apiPath: string, fallbackType: string) => Promise<string | null>>();

const IMAGE: AttachmentPreviewItem = {
  url: "blob:receipt",
  name: "receipt.png",
  mime: "image/png",
};

const onClose = vi.fn();

const show = (item: AttachmentPreviewItem = IMAGE) =>
  render(<AttachmentFullScreenViewer item={item} onClose={onClose} />);

const viewer = () => screen.getByRole("dialog");
const close = () => screen.getByRole("button", { name: "Close preview" });

beforeEach(() => {
  registerFilePreviewHost({ iconClass: "material-symbols-rounded", fetchBlob: fetchProxyBlob });
  onClose.mockReset();
});

describe("the overlay", () => {
  it("is a modal dialog named after the file", () => {
    show();

    expect(viewer()).toHaveAttribute("aria-modal", "true");
    expect(viewer()).toHaveAccessibleName("receipt.png");
  });

  it("never offers a link out or a download", () => {
    show();

    expect(within(viewer()).queryAllByRole("link")).toHaveLength(0);
    expect(viewer().querySelector('[target="_blank"]')).toBeNull();
    expect(viewer().querySelector("[download]")).toBeNull();
  });

  it("closes on the backdrop's close control", async () => {
    show();

    await userEvent.click(close());

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("the keyboard", () => {
  it("starts focus on Close, so Escape and Enter both work straight away", async () => {
    show();

    await waitFor(() => expect(close()).toHaveFocus());
  });

  it("closes on Escape", async () => {
    show();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("swallows Escape, so the modal underneath stays open", async () => {
    // A parent modal's own listener is bubble-phase on window, like the real ones.
    const parent = vi.fn();
    window.addEventListener("keydown", parent);
    show();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
    window.removeEventListener("keydown", parent);
  });

  it("keeps Tab inside itself", async () => {
    show();
    await waitFor(() => expect(close()).toHaveFocus());

    await userEvent.tab();

    expect(viewer().contains(document.activeElement)).toBe(true);
  });

  it("hands focus back to whatever opened it", async () => {
    render(<button type="button">View full</button>);
    const opener = screen.getByRole("button", { name: "View full" });
    opener.focus();
    const { unmount } = show();
    await waitFor(() => expect(close()).toHaveFocus());

    unmount();

    expect(opener).toHaveFocus();
  });
});

describe("what it draws", () => {
  it("draws an image as an image", () => {
    show();

    expect(within(viewer()).getByAltText("receipt.png")).toBeInTheDocument();
  });

  it("hands a PDF to the pdf.js renderer", () => {
    show({ url: "blob:inv", name: "invoice.pdf", mime: "application/pdf" });

    expect(screen.getByText("pdf: invoice.pdf")).toHaveAttribute("data-pdf", "blob:inv");
  });

  it("sandboxes HTML rather than running it", () => {
    show({ url: "blob:page", name: "statement.html", mime: "text/html" });

    const frame = viewer().querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toHaveAttribute("title", "statement.html");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerPolicy", "no-referrer");
  });

  it("says so for a file it cannot draw, instead of offering it for download", () => {
    show({ url: "blob:bin", name: "payload.bin", mime: "application/octet-stream" });

    expect(screen.getByText("Preview is not available for this file type.")).toBeInTheDocument();
    expect(within(viewer()).queryAllByRole("link")).toHaveLength(0);
  });
});

// The mime a browser reports cannot be trusted, and a wrong answer here is the difference
// between drawing the file and telling the user it cannot be drawn.
describe("resolving the type", () => {
  it("reads the extension when the browser gives no type", () => {
    expect(resolvePreviewMime(new File(["x"], "scan.pdf", { type: "" }))).toBe("application/pdf");
    expect(resolvePreviewMime(new File(["x"], "scan.PNG", { type: "" }))).toBe("image/*");
    expect(resolvePreviewMime(new File(["x"], "page.htm", { type: "" }))).toBe("text/html");
  });

  it("distrusts octet-stream, which is what B2 calls a PDF", () => {
    const f = new File(["x"], "slip.pdf", { type: "application/octet-stream" });

    expect(resolvePreviewMime(f)).toBe("application/pdf");
  });

  it("keeps a type the browser did give", () => {
    expect(resolvePreviewMime(new File(["x"], "a.png", { type: "image/webp" }))).toBe("image/webp");
  });

  it("gives up on an extension it does not know", () => {
    expect(nameToPreviewMime("payload.bin")).toBe("application/octet-stream");
    expect(nameToPreviewMime("noextension")).toBe("application/octet-stream");
  });

  it("builds an item for a staged file", () => {
    const f = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

    expect(fileToPreviewItem(f, "blob:abc")).toEqual({
      url: "blob:abc",
      name: "receipt.jpg",
      mime: "image/jpeg",
    });
  });
});

// An iPhone HEIC (the user, 2026-11-24) is stored as uploaded. Safari 17+ draws it as it is;
// where the browser can't, a saved one is fetched again as a JPEG the API makes on the fly.
describe("an iPhone HEIC", () => {
  const proxy = fetchProxyBlob;
  const HEIC = {
    url: "https://b2.example/presigned",
    name: "IMG_1.HEIC",
    mime: "image/heic",
    previewApiPath: "/api/v1/bills/b1/attachments/a1/preview/",
  };
  const photo = () => screen.getByRole("img", { name: "IMG_1.HEIC" });

  beforeEach(() => proxy.mockReset());

  it("is drawn as it is where the browser can, with nothing fetched", () => {
    render(<PreviewBlock {...HEIC} />);

    expect(photo()).toHaveAttribute("src", HEIC.url);
    expect(proxy).not.toHaveBeenCalled();
  });

  it("is fetched as a JPEG made on the fly where the browser can't draw it", async () => {
    proxy.mockResolvedValue("blob:jpeg");
    render(<PreviewBlock {...HEIC} />);

    fireEvent.error(photo());

    await waitFor(() => expect(photo()).toHaveAttribute("src", "blob:jpeg"));
    expect(proxy).toHaveBeenCalledWith(`${HEIC.previewApiPath}?as=jpeg`, "image/jpeg");
  });

  it("says it can't be shown when the JPEG can't be made either", async () => {
    proxy.mockResolvedValue(null);
    render(<PreviewBlock {...HEIC} />);

    fireEvent.error(photo());

    expect(await screen.findByText("This photo can't be shown here.")).toBeInTheDocument();
  });

  it("not yet saved, says it can be seen once saved", () => {
    render(<PreviewBlock url="blob:staged" name="IMG_1.HEIC" mime="image/heic" />);

    fireEvent.error(photo());

    expect(screen.getByText("This photo can be viewed once it's saved.")).toBeInTheDocument();
    expect(proxy).not.toHaveBeenCalled();
  });

  it("leaves any other image that won't draw exactly as before", () => {
    render(<PreviewBlock url="blob:x" name="slip.png" mime="image/png" />);

    fireEvent.error(screen.getByRole("img", { name: "slip.png" }));

    expect(screen.getByRole("img", { name: "slip.png" })).toHaveAttribute("src", "blob:x");
    expect(proxy).not.toHaveBeenCalled();
  });
});

describe("the inline pane", () => {
  const file = new File(["x".repeat(2048)], "receipt.pdf", { type: "application/pdf" });

  it("names the file and its size, and draws it", () => {
    render(
      <FilePreviewPane
        item={fileToPreviewItem(file, "blob:r")}
        size={file.size}
        onViewFull={onClose}
      />,
    );

    expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2.0 KB/)).toHaveTextContent("Document preview • 2.0 KB");
    expect(screen.getByText("pdf: receipt.pdf")).toHaveAttribute("data-pdf", "blob:r");
  });

  it("leaves the size out for a saved file that does not know it", () => {
    render(<FilePreviewPane item={IMAGE} onViewFull={onClose} />);

    expect(screen.getByText("Document preview")).toBeInTheDocument();
    expect(screen.queryByText(/ • /)).toBeNull();
  });

  it("opens the full view from its corner control", async () => {
    render(<FilePreviewPane item={IMAGE} onViewFull={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "View full — receipt.png" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("draws its icons in the app's own icon font", () => {
    registerFilePreviewHost({ iconClass: "material-symbols-outlined", fetchBlob: fetchProxyBlob });
    render(<FilePreviewPane item={IMAGE} onViewFull={onClose} />);

    expect(screen.getByText("open_in_full")).toHaveClass("material-symbols-outlined");
  });
});

describe("the helpers", () => {
  it("sizes a file as Add Payment does", () => {
    expect(formatFileSize(820)).toBe("820 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(formatFileSize(-1)).toBe("—");
  });

  it("picks an icon by the file's kind", () => {
    expect(fileIconInfo("a.PDF").icon).toBe("picture_as_pdf");
    expect(fileIconInfo("IMG_1.heic").icon).toBe("image");
    expect(fileIconInfo("s.htm").icon).toBe("html");
    expect(fileIconInfo("x.bin").icon).toBe("draft");
  });
});
