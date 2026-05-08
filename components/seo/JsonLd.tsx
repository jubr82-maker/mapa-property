interface Props {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: Props) {
  const arr = Array.isArray(data) ? data : [data];
  return (
    <>
      {arr.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
