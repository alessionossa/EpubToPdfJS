export interface OutlineNode {
    title: string,
    page: number,
    children: OutlineNode[] | undefined
}

export interface ViewPort {
    width: number | string;
    height: number | string;
}