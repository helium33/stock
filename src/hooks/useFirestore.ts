import useSWR from 'swr';
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debounce } from '../lib/utils';

const PAGE_SIZE = 20;

const fetcher = async (key: string, queryConstraints: QueryConstraint[]) => {
  const q = query(collection(db, key), ...queryConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const useFirestoreQuery = (
  collectionName: string,
  queryConstraints: QueryConstraint[] = [],
  options = { revalidateOnFocus: false }
) => {
  const { data, error, mutate } = useSWR(
    [collectionName, queryConstraints],
    ([col, constraints]) => fetcher(col, constraints),
    options
  );

  return {
    data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};

export const usePaginatedFirestore = (
  collectionName: string,
  baseConstraints: QueryConstraint[] = []
) => {
  const [lastDoc, setLastDoc] = React.useState<any>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const loadMore = async () => {
    if (!hasMore) return;

    const constraints = [...baseConstraints];
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(PAGE_SIZE));

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);

    if (snapshot.docs.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  return { loadMore, hasMore };
};

export const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};